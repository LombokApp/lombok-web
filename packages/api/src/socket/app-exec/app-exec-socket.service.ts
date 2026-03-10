import { safeZodParse } from '@lombokapp/utils'
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import type { Socket } from 'socket.io'
import { z } from 'zod'

import { AppService } from '../../app/services/app.service'
import {
  AccessTokenJWT,
  APP_USER_JWT_SUB_PREFIX,
  JWTService,
} from '../../auth/services/jwt.service'
import { DockerClientService } from '../../docker/services/client/docker-client.service'
import type {
  DockerPipeStream,
  DockerTtyStream,
} from '../../docker/services/client/docker-client.types'
import { DOCKER_LABELS } from '../../docker/services/docker-jobs.service'

const AppExecAuthPayload = z.object({
  token: z.string(),
  command: z.array(z.string()).min(1),
  mode: z.enum(['pty', 'pipe']),
  cols: z.number().int().positive().optional(),
  rows: z.number().int().positive().optional(),
  env: z.record(z.string(), z.string()).optional(),
})

type ExecStream =
  | { mode: 'pty'; stream: DockerTtyStream }
  | { mode: 'pipe'; stream: DockerPipeStream }

@Injectable()
export class AppExecSocketService {
  private readonly logger = new Logger(AppExecSocketService.name)
  // Key: socket.id -> one exec stream per socket connection
  private readonly execStreams = new Map<string, ExecStream>()
  // Key: socket.id -> resolves true when connection setup + exec succeeds
  private readonly connectionReady = new Map<string, Promise<boolean>>()

  constructor(
    private readonly jwtService: JWTService,
    private readonly dockerClientService: DockerClientService,
    private readonly appService: AppService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    this.logger.debug(
      `AppExecSocketService handleConnection: [${socket.nsp.name}]`,
    )
    // Store the setup promise so message handlers can await it
    const ready = this.setupConnection(socket)
    this.connectionReady.set(socket.id, ready)
    await ready
  }

  handleDisconnect(socket: Socket): void {
    this.logger.debug(`AppExecSocketService handleDisconnect: ${socket.id}`)
    this.destroyStream(socket)
    this.connectionReady.delete(socket.id)
  }

  handleInput(socket: Socket, data: { input: string }): void {
    const ready = this.connectionReady.get(socket.id)
    if (!ready) {
      return
    }
    void ready.then((ok) => {
      if (!ok) {
        return
      }
      const entry = this.execStreams.get(socket.id)
      if (entry) {
        entry.stream.write(data.input)
      }
    })
  }

  async handleResize(
    socket: Socket,
    data: { cols: number; rows: number },
  ): Promise<void> {
    const ready = this.connectionReady.get(socket.id)
    if (!ready) {
      return
    }
    const ok = await ready
    if (!ok) {
      return
    }
    const entry = this.execStreams.get(socket.id)
    if (entry?.mode !== 'pty') {
      return
    }
    try {
      await entry.stream.resize(data.cols, data.rows)
    } catch (error: unknown) {
      this.logger.warn(`Failed to resize PTY for socket ${socket.id}:`, error)
    }
  }

  private async setupConnection(socket: Socket): Promise<boolean> {
    // --- Validate handshake payload (token + exec params) ---
    const auth = socket.handshake.auth
    if (!safeZodParse(auth, AppExecAuthPayload)) {
      this.logger.error('Bad auth payload:', auth)
      socket.disconnect(true)
      return false
    }

    // --- Auth: verify JWT and extract app-user identity ---
    const token = auth.token
    let userId: string
    let appIdentifier: string

    try {
      const verifiedToken = AccessTokenJWT.parse(
        this.jwtService.verifyUserJWT(token),
      )
      if (!verifiedToken.sub.startsWith(APP_USER_JWT_SUB_PREFIX)) {
        throw new UnauthorizedException()
      }
      const parts = verifiedToken.sub.split(':')
      if (!parts[1] || !parts[2]) {
        throw new UnauthorizedException()
      }
      userId = parts[1]
      appIdentifier = parts[2]
    } catch (error: unknown) {
      this.logger.error('AppExec socket auth error:', error)
      socket.conn.close()
      return false
    }

    // --- Extract containerId from namespace ---
    // Namespace format: /app-exec/<hostId>:<containerId>/...
    const [hostId, containerId] =
      socket.nsp.name.split('/')[2]?.split(':') ?? []
    if (!containerId || !hostId) {
      this.logger.error(
        'Invalid container reference in namespace (should be /app-exec/<hostId>:<containerId>/<...>):',
        socket.nsp.name,
      )
      socket.disconnect(true)
      return false
    }

    // --- ACL checks at connection time ---

    // Check 1: App is enabled for this user
    try {
      await this.appService.validateAppUserAccess({ appIdentifier, userId })
    } catch {
      this.logger.warn(
        `ACL denied: app "${appIdentifier}" not enabled for user "${userId}" (socket: ${socket.id})`,
      )
      socket.emit('exec:error', { message: 'App not enabled for user' })
      socket.disconnect(true)
      return false
    }

    // Check 2: Container exists
    const foundContainer = await this.dockerClientService.findContainerById(
      hostId,
      containerId,
      {
        startIfNotRunning: true,
      },
    )

    if (!foundContainer) {
      this.logger.warn(
        `ACL denied: no running container for instance "${containerId}" (socket: ${socket.id})`,
      )
      socket.emit('exec:error', {
        message: `No running container found for instance "${containerId}"`,
      })
      socket.disconnect(true)
      return false
    }

    const container = foundContainer

    // Check 3: Container belongs to the requesting app
    const containerAppId = container.labels[DOCKER_LABELS.APP_ID]
    if (!containerAppId || containerAppId !== appIdentifier) {
      this.logger.warn(
        `ACL denied: app "${appIdentifier}" tried to access container owned by "${containerAppId}" (socket: ${socket.id})`,
      )
      socket.emit('exec:error', { message: 'Container not owned by this app' })
      socket.disconnect(true)
      return false
    }

    // Check 4: Container is attributed to the requesting user
    const containerUserId = container.labels[DOCKER_LABELS.USER_ID]
    if (!containerUserId || containerUserId !== userId) {
      this.logger.warn(
        `ACL denied: user "${userId}" tried to access container owned by "${containerUserId}" (socket: ${socket.id})`,
      )
      socket.emit('exec:error', {
        message: 'Container not owned by this user',
      })
      socket.disconnect(true)
      return false
    }

    // --- Store resolved info on socket.data ---
    const socketData = socket.data as Record<string, unknown>
    socketData.userId = userId
    socketData.appIdentifier = appIdentifier
    socketData.hostId = hostId
    socketData.containerId = container.id

    this.logger.debug(
      `AppExec socket authenticated userId: ${userId}, appIdentifier: ${appIdentifier}, container: ${container.id} (socket: ${socket.id})`,
    )

    // --- Auto-exec: create docker exec stream on successful auth ---
    try {
      if (auth.mode === 'pty') {
        const ttyStream = await this.dockerClientService.execTty(
          hostId,
          container.id,
          auth.command,
          {
            cols: auth.cols,
            rows: auth.rows,
            env: auth.env ?? { TERM: 'xterm-256color' },
          },
        )

        ttyStream.onData((chunk: Buffer) => {
          socket.emit('exec:data', { dataBase64: chunk.toString('base64') })
        })

        ttyStream.onEnd(() => {
          socket.emit('exec:exit', {})
          this.execStreams.delete(socket.id)
        })

        this.execStreams.set(socket.id, { mode: 'pty', stream: ttyStream })
      } else {
        const pipeStream = await this.dockerClientService.execPipe(
          hostId,
          container.id,
          auth.command,
          { env: auth.env },
        )

        pipeStream.onStdout((chunk: Buffer) => {
          socket.emit('exec:stdout', { dataBase64: chunk.toString('base64') })
        })

        pipeStream.onStderr((chunk: Buffer) => {
          socket.emit('exec:stderr', { dataBase64: chunk.toString('base64') })
        })

        pipeStream.onEnd(() => {
          socket.emit('exec:exit', {})
          this.execStreams.delete(socket.id)
        })

        this.execStreams.set(socket.id, { mode: 'pipe', stream: pipeStream })
      }

      socket.emit('exec:ready', { containerId: container.id })

      this.logger.debug(
        `Exec attached (${auth.mode}): socket=${socket.id}, container=${container.id}`,
      )
    } catch (error: unknown) {
      this.logger.error(`Failed to attach exec for socket ${socket.id}:`, error)
      socket.emit('exec:error', {
        message:
          error instanceof Error ? error.message : 'Failed to attach exec',
      })
      socket.disconnect(true)
      return false
    }

    return true
  }

  private destroyStream(socket: Socket): void {
    const entry = this.execStreams.get(socket.id)
    if (entry) {
      entry.stream.destroy()
      this.execStreams.delete(socket.id)
      this.logger.debug(`Exec stream destroyed: socket=${socket.id}`)
    }
  }
}
