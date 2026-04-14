import { safeZodParse } from '@lombokapp/utils'
import { Injectable, Logger, UnauthorizedException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import type { Socket } from 'socket.io'
import { z } from 'zod'

import {
  AccessTokenJWT,
  JWTService,
  USER_JWT_SUB_PREFIX,
} from '../../auth/services/jwt.service'
import { DockerClientService } from '../../docker/services/client/docker-client.service'
import type { DockerTtyStream } from '../../docker/services/client/docker-client.types'
import { OrmService } from '../../orm/orm.service'
import { usersTable } from '../../users/entities/user.entity'

const ContainerExecAuthPayload = z.object({
  token: z.string(),
  command: z.array(z.string()).min(1).optional(),
  cols: z.number().int().positive().optional(),
  rows: z.number().int().positive().optional(),
})

@Injectable()
export class ContainerExecSocketService {
  private readonly logger = new Logger(ContainerExecSocketService.name)
  // Key: socket.id -> one exec stream per socket connection
  private readonly execStreams = new Map<string, DockerTtyStream>()
  // Key: socket.id -> resolves true when connection setup + exec succeeds
  private readonly connectionReady = new Map<string, Promise<boolean>>()

  constructor(
    private readonly jwtService: JWTService,
    private readonly dockerClientService: DockerClientService,
    private readonly ormService: OrmService,
  ) {}

  async handleConnection(socket: Socket): Promise<void> {
    this.logger.debug(
      `ContainerExecSocketService handleConnection: [${socket.nsp.name}]`,
    )
    // Store the setup promise so message handlers can await it
    const ready = this.setupConnection(socket)
    this.connectionReady.set(socket.id, ready)
    await ready
  }

  handleDisconnect(socket: Socket): void {
    this.logger.debug(
      `ContainerExecSocketService handleDisconnect: ${socket.id}`,
    )
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
      const stream = this.execStreams.get(socket.id)
      if (stream) {
        stream.write(data.input)
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
    const stream = this.execStreams.get(socket.id)
    if (!stream) {
      return
    }
    try {
      await stream.resize(data.cols, data.rows)
    } catch (error: unknown) {
      this.logger.warn(`Failed to resize PTY for socket ${socket.id}:`, error)
    }
  }

  private async setupConnection(socket: Socket): Promise<boolean> {
    // --- Validate handshake payload (token + exec params) ---
    const auth = socket.handshake.auth
    if (!safeZodParse(auth, ContainerExecAuthPayload)) {
      this.logger.error('Bad auth payload:', auth)
      socket.disconnect(true)
      return false
    }

    // --- Auth: verify JWT and extract user identity ---
    const token = auth.token
    let userId: string

    try {
      const verifiedToken = AccessTokenJWT.parse(
        this.jwtService.verifyUserJWT(token),
      )
      if (!verifiedToken.sub.startsWith(USER_JWT_SUB_PREFIX)) {
        throw new UnauthorizedException()
      }
      const extractedUserId = verifiedToken.sub.split(':')[1]
      if (!extractedUserId) {
        throw new UnauthorizedException()
      }
      userId = extractedUserId
    } catch (error: unknown) {
      this.logger.error('ContainerExec socket auth error:', error)
      socket.conn.close()
      return false
    }

    // --- Admin check: look up user and verify isAdmin ---
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    })

    if (!user?.isAdmin) {
      this.logger.warn(
        `Admin check denied: user "${userId}" is not an admin (socket: ${socket.id})`,
      )
      socket.emit('exec:error', { message: 'Admin access required' })
      socket.disconnect(true)
      return false
    }

    // --- Extract hostId and containerId from namespace ---
    // Namespace format: /container-exec/<hostId>:<containerId>
    const [hostId, containerId] =
      socket.nsp.name.split('/')[2]?.split(':') ?? []
    if (!containerId || !hostId) {
      this.logger.error(
        'Invalid container reference in namespace (should be /container-exec/<hostId>:<containerId>):',
        socket.nsp.name,
      )
      socket.disconnect(true)
      return false
    }

    // --- Store resolved info on socket.data ---
    const socketData = socket.data as Record<string, unknown>
    socketData.userId = userId
    socketData.hostId = hostId
    socketData.containerId = containerId

    this.logger.debug(
      `ContainerExec socket authenticated userId: ${userId}, container: ${containerId} (socket: ${socket.id})`,
    )

    // --- Auto-exec: create docker exec stream on successful auth ---
    const command = auth.command ?? ['/bin/sh']
    try {
      const ttyStream = await this.dockerClientService.execTty(
        containerId,
        command,
        {
          cols: auth.cols,
          rows: auth.rows,
          env: { TERM: 'xterm-256color' },
          hostId,
        },
      )

      ttyStream.onData((chunk: Buffer) => {
        socket.emit('exec:data', { dataBase64: chunk.toString('base64') })
      })

      ttyStream.onEnd(() => {
        socket.emit('exec:exit', {})
        this.execStreams.delete(socket.id)
      })

      this.execStreams.set(socket.id, ttyStream)

      socket.emit('exec:ready', { containerId })

      this.logger.debug(
        `Exec attached (pty): socket=${socket.id}, container=${containerId}`,
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
    const stream = this.execStreams.get(socket.id)
    if (stream) {
      stream.destroy()
      this.execStreams.delete(socket.id)
      this.logger.debug(`Exec stream destroyed: socket=${socket.id}`)
    }
  }
}
