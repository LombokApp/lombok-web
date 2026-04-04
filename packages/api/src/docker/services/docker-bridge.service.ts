import { Inject, Injectable, Logger } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import crypto from 'crypto'
import fs from 'fs'
import { createServer, Socket } from 'net'
import path from 'path'
import { coreConfig } from 'src/core/config'

import {
  createSocketServer,
  writeSocketMessage,
} from '../../core-worker/socket-utils'

interface BridgeIpcResponse {
  type: 'response'
  id: string
  payload: {
    action: string
    payload: { success: boolean; error?: { message: string } }
  }
}

const BRIDGE_SECRET_PATH = '/var/lib/lombok/bridge-secret'
const TUNNEL_TOKEN_TTL_SECONDS = 86400 // 24 hours

@Injectable()
export class DockerBridgeService {
  private readonly logger = new Logger(DockerBridgeService.name)
  private readonly bridgeSecret: string
  private child: ReturnType<typeof Bun.spawn> | undefined
  private ipcSocket: Socket | undefined
  private socketCleanup: (() => void) | undefined
  private ready = false
  private stopping = false
  private readonly pendingRequests = new Map<
    string,
    {
      resolve: (response: BridgeIpcResponse['payload']['payload']) => void
      reject: (error: Error) => void
      timeout: NodeJS.Timeout
    }
  >()

  constructor(
    @Inject(coreConfig.KEY)
    private readonly config: ConfigType<typeof coreConfig>,
  ) {
    this.bridgeSecret = this.loadOrCreateSecret()
  }

  getSecret(): string {
    return this.bridgeSecret
  }

  isReady(): boolean {
    return this.ready
  }

  async startBridge(): Promise<void> {
    const hasDocker = this.hasDockerSocket()
    if (!hasDocker) {
      this.logger.warn('No Docker socket found, skipping bridge startup')
      return
    }

    const hosts = this.config.dockerHostConfig.hosts
    if (!hosts || Object.keys(hosts).length === 0) {
      this.logger.warn('No Docker hosts configured, skipping bridge startup')
      return
    }

    const instanceId = crypto.randomUUID()
    const socketPath = `/tmp/lombok-docker-bridge-${instanceId}.sock`

    // Create IPC server
    const { server, cleanup } = await createSocketServer(
      socketPath,
      (message: string, _socket: Socket) => {
        this.handleBridgeMessage(message)
      },
    )
    this.socketCleanup = cleanup

    server.on('connection', (socket: Socket) => {
      this.ipcSocket = socket
      socket.on('close', () => {
        this.ipcSocket = undefined
        this.ready = false
      })
    })

    // Resolve bridge directory by walking up from __dirname until we find it.
    // In dev: __dirname = .../packages/api/src/docker/services
    // In prod: __dirname = .../packages/api/dist/src/docker/services
    const bridgeDir = this.findBridgeDir(__dirname)
    const binaryPath = path.join(bridgeDir, 'docker-bridge')
    const sourcePath = path.join(bridgeDir, 'src/index.ts')

    let cmd: string[]
    if (fs.existsSync(binaryPath)) {
      cmd = [binaryPath]
    } else if (fs.existsSync(sourcePath)) {
      cmd = ['bun', 'run', sourcePath]
    } else {
      this.logger.error('No bridge binary or source found')
      return
    }

    this.logger.debug(`Starting bridge: ${cmd.join(' ')}`)

    // Build NODE_PATH for compiled binary's runtime deps
    const bridgeNodeModules = path.join(bridgeDir, 'node_modules')
    const nodePath = fs.existsSync(bridgeNodeModules)
      ? bridgeNodeModules
      : undefined

    this.child = Bun.spawn(cmd, {
      stdout: 'pipe',
      stderr: 'pipe',
      env: {
        ...process.env,
        LOMBOK_DOCKER_BRIDGE_SOCKET_PATH: socketPath,
        ...(nodePath ? { NODE_PATH: nodePath } : {}),
      },
    })

    this.setupShutdownHooks(this.child)
    this.pipeOutput(this.child)

    // Auto-restart on any exit unless the API itself is shutting down
    void this.child.exited.then((exitCode) => {
      this.ready = false
      this.ipcSocket = undefined
      if (this.socketCleanup) {
        this.socketCleanup()
        this.socketCleanup = undefined
      }
      if (this.stopping) {
        return
      }
      this.logger.warn(
        `Docker bridge exited with code ${String(exitCode)}, restarting in 1s...`,
      )
      setTimeout(() => {
        void this.startBridge()
      }, 1000)
    })

    // Wait for bridge to connect then send init
    await this.waitForConnection(server, 10000)

    // Send init config
    await this.sendInit(hosts)

    this.ready = true
    this.logger.log('Docker bridge started and ready')
  }

  async updateHosts(
    hosts: Record<string, { type: string; host: string }>,
  ): Promise<void> {
    await this.sendRequest('update_hosts', hosts)
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async sendInit(
    hosts: Record<string, { type: string; host: string }>,
  ): Promise<void> {
    const initPayload = {
      bridgeApiSecret: this.bridgeSecret,
      bridgeJwtSecret: this.bridgeSecret,
      bridgeJwtExpiry: TUNNEL_TOKEN_TTL_SECONDS,
      httpPort: 3100,
      wsPort: 3101,
      logLevel: process.env.LOG_LEVEL ?? 'info',
      maxSessions: 200,
      maxConcurrentPerSession: 100,
      sessionIdleTimeout: 1800000,
      ephemeralGracePeriod: 5000,
      dockerHosts: hosts,
    }

    const response = await this.sendRequest('init', initPayload, 30000)
    if (!response.success) {
      throw new Error(
        `Bridge init failed: ${response.error?.message ?? 'unknown error'}`,
      )
    }
  }

  private sendRequest(
    action: string,
    payload: unknown,
    timeoutMs = 10000,
  ): Promise<{ success: boolean; error?: { message: string } }> {
    if (!this.ipcSocket) {
      return Promise.reject(new Error('Bridge IPC socket not available'))
    }

    const id = crypto.randomUUID()

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id)
        reject(new Error(`Bridge request timed out (${action})`))
      }, timeoutMs)

      this.pendingRequests.set(id, { resolve, reject, timeout })

      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      void writeSocketMessage(this.ipcSocket!, {
        type: 'request',
        id,
        payload: { action, payload },
      }).catch((err) => {
        this.pendingRequests.delete(id)
        clearTimeout(timeout)
        reject(err instanceof Error ? err : new Error(String(err)))
      })
    })
  }

  private handleBridgeMessage(line: string): void {
    let data: unknown
    try {
      data = JSON.parse(line)
    } catch {
      return
    }

    const msg = data as BridgeIpcResponse
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (msg.type === 'response' && msg.id) {
      const pending = this.pendingRequests.get(msg.id)
      if (pending) {
        clearTimeout(pending.timeout)
        this.pendingRequests.delete(msg.id)
        pending.resolve(msg.payload.payload)
      }
    }
  }

  private waitForConnection(
    server: ReturnType<typeof createServer>,
    timeoutMs: number,
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ipcSocket) {
        resolve()
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('Bridge IPC connection timeout'))
      }, timeoutMs)

      server.once('connection', () => {
        clearTimeout(timeout)
        resolve()
      })
    })
  }

  private setupShutdownHooks(child: ReturnType<typeof Bun.spawn>): void {
    const terminate = () => {
      this.stopping = true
      try {
        child.kill()
      } catch {
        void 0
      }
      if (this.socketCleanup) {
        this.socketCleanup()
      }
    }
    process.once('SIGINT', terminate)
    process.once('SIGTERM', terminate)
    process.once('exit', terminate)
  }

  private pipeOutput(child: ReturnType<typeof Bun.spawn>): void {
    const readStream = async (
      stream: ReturnType<typeof Bun.spawn>['stdout'],
      prefix: string,
    ) => {
      if (!stream || typeof stream === 'number') {
        return
      }
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      try {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          this.logger.debug(
            `[docker-bridge ${prefix}] ${decoder.decode(value)}`,
          )
        }
      } catch {
        // Stream closed
      } finally {
        reader.releaseLock()
      }
    }

    void readStream(child.stdout, 'stdout')
    void readStream(child.stderr, 'stderr')
  }

  private findBridgeDir(startDir: string): string {
    let dir = startDir
    for (let i = 0; i < 10; i++) {
      const candidate = path.join(dir, 'docker/docker-bridge')
      if (fs.existsSync(candidate)) {
        return candidate
      }
      const parent = path.dirname(dir)
      if (parent === dir) {
        break
      }
      dir = parent
    }
    // Fallback: try relative to cwd (covers edge cases)
    return path.resolve(process.cwd(), 'docker/docker-bridge')
  }

  private loadOrCreateSecret(): string {
    try {
      const existing = fs.readFileSync(BRIDGE_SECRET_PATH, 'utf-8').trim()
      if (existing.length >= 32) {
        this.logger.debug('Loaded bridge secret from disk')
        return existing
      }
    } catch {
      // File doesn't exist or is unreadable — generate a new one
    }

    const secret = crypto.randomBytes(32).toString('base64url')
    try {
      const dir = path.dirname(BRIDGE_SECRET_PATH)
      fs.mkdirSync(dir, { recursive: true })
      fs.writeFileSync(BRIDGE_SECRET_PATH, secret, { mode: 0o600 })
      this.logger.debug('Generated and saved new bridge secret')
    } catch (err) {
      this.logger.warn(
        `Could not persist bridge secret to ${BRIDGE_SECRET_PATH}: ${err instanceof Error ? err.message : String(err)}`,
      )
    }
    return secret
  }

  private hasDockerSocket(): boolean {
    try {
      return fs.statSync('/var/run/docker.sock').isSocket()
    } catch {
      return false
    }
  }
}
