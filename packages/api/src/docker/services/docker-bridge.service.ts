import { Injectable, Logger } from '@nestjs/common'
import crypto from 'crypto'
import fs from 'fs'
import { createServer, Socket } from 'net'
import path from 'path'

import {
  createSocketServer,
  writeSocketMessage,
} from '../../core-worker/socket-utils'
import { DockerHostManagementService } from './docker-host-management.service'

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

/** Bridge log entries retained in memory for the admin live-log view. */
const LOG_RING_MAX = 2000

/** One captured line of bridge process output. */
export interface BridgeLogEntry {
  seq: number // monotonic; lets the UI dedupe the backlog→live handoff
  source: 'stdout' | 'stderr'
  level: 'debug' | 'info' | 'warn' | 'error' | 'unknown'
  ts: string
  msg: string
  fields?: Record<string, unknown> // remaining context keys (sessionId, hostId, …)
  raw?: string // set only for non-JSON / stderr lines
}

@Injectable()
export class DockerBridgeService {
  private readonly logger = new Logger(DockerBridgeService.name)
  private readonly bridgeSecret: string
  private child: ReturnType<typeof Bun.spawn> | undefined
  private ipcSocket: Socket | undefined
  private socketCleanup: (() => void) | undefined
  private ready = false
  private stopping = false
  private readonly logRing: BridgeLogEntry[] = []
  private logSeq = 0
  private readonly logSubscribers = new Set<(entry: BridgeLogEntry) => void>()
  private readonly readyCallbacks = new Set<() => void>()
  private readonly pendingRequests = new Map<
    string,
    {
      resolve: (response: BridgeIpcResponse['payload']['payload']) => void
      reject: (error: Error) => void
      timeout: NodeJS.Timeout
    }
  >()

  constructor(
    private readonly dockerHostManagementService: DockerHostManagementService,
  ) {
    this.bridgeSecret = this.loadOrCreateSecret()
  }

  getSecret(): string {
    return this.bridgeSecret
  }

  isReady(): boolean {
    return this.ready
  }

  /** Register a callback fired on each bridge (re)connect (first boot + every restart); drives durable-tunnel replay. Returns an idempotent unsubscribe. */
  onReady(cb: () => void): () => void {
    this.readyCallbacks.add(cb)
    return () => this.readyCallbacks.delete(cb)
  }

  /** Recent captured bridge log lines (most recent last), newest-capped at the ring size. */
  getRecentLogs(opts?: { tail?: number; level?: string }): BridgeLogEntry[] {
    const tail = Math.min(Math.max(1, opts?.tail ?? 500), LOG_RING_MAX)
    const want = opts?.level?.toLowerCase()
    const entries = want
      ? this.logRing.filter((e) => e.level === want)
      : this.logRing
    return entries.slice(-tail)
  }

  /** Subscribe to live bridge log entries. Returns an idempotent unsubscribe. */
  subscribeLogs(cb: (entry: BridgeLogEntry) => void): () => void {
    this.logSubscribers.add(cb)
    let active = true
    return () => {
      if (!active) {
        return
      }
      active = false
      this.logSubscribers.delete(cb)
    }
  }

  async startBridge(): Promise<void> {
    const hosts = await this.buildHostsMap()
    if (Object.keys(hosts).length === 0) {
      this.logger.warn('No Docker hosts configured, skipping bridge startup')
      return
    }

    const instanceId = crypto.randomUUID()
    const socketPath = `/tmp/lombok-docker-bridge-${instanceId}.sock`

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

    // Walk up from cwd, not __dirname: Bun's bundler bakes __dirname in as the
    // build-time source path, which doesn't exist in the standalone image.
    const bridgeDir = this.findBridgeDir(process.cwd())
    const bundlePath = path.join(bridgeDir, 'dist/index.js')
    const sourcePath = path.join(bridgeDir, 'src/index.ts')

    let cmd: string[]
    if (fs.existsSync(bundlePath)) {
      cmd = ['bun', bundlePath]
    } else if (fs.existsSync(sourcePath)) {
      cmd = ['bun', 'run', sourcePath]
    } else {
      this.logger.error('No bridge bundle or source found')
      return
    }

    this.logger.debug(`Starting bridge: ${cmd.join(' ')}`)

    // NODE_PATH for the compiled binary's runtime deps.
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

    await this.waitForConnection(server, 10000)
    await this.sendInit(hosts)

    this.ready = true
    this.logger.log('Docker bridge started and ready')

    // Fire-and-forget; a ready callback must never block startup.
    for (const cb of this.readyCallbacks) {
      try {
        cb()
      } catch (err) {
        this.logger.warn(
          `Bridge onReady callback threw: ${err instanceof Error ? err.message : String(err)}`,
        )
      }
    }
  }

  async syncHosts(): Promise<void> {
    const hosts = await this.buildHostsMap()

    if (Object.keys(hosts).length === 0) {
      this.logger.warn(
        'No enabled Docker hosts remain — bridge will reject new sessions',
      )
    }

    if (!this.ready) {
      // Bridge not running yet: start it if we now have hosts.
      if (Object.keys(hosts).length > 0) {
        await this.startBridge()
      }
      return
    }

    await this.sendRequest('update_hosts', hosts)
  }

  // ---------------------------------------------------------------------------
  // Private
  // ---------------------------------------------------------------------------

  private async buildHostsMap(): Promise<
    Record<string, { type: string; host: string }>
  > {
    const dbHosts = await this.dockerHostManagementService.listHosts()
    const map: Record<string, { type: string; host: string }> = {}
    for (const h of dbHosts) {
      if (!h.enabled) {
        continue
      }
      map[h.id] = { type: h.type, host: h.host }
    }
    return map
  }

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
      source: 'stdout' | 'stderr',
    ) => {
      if (!stream || typeof stream === 'number') {
        return
      }
      const reader = stream.getReader()
      const decoder = new TextDecoder()
      // Per-child carry for partial trailing lines; reset per invocation so a killed child's dangling bytes can't corrupt the next child.
      let carry = ''
      try {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          carry += decoder.decode(value, { stream: true })
          let nl = carry.indexOf('\n')
          while (nl !== -1) {
            this.ingestLine(carry.slice(0, nl), source)
            carry = carry.slice(nl + 1)
            nl = carry.indexOf('\n')
          }
        }
      } catch {
        // Stream closed
      } finally {
        if (carry.length > 0) {
          this.ingestLine(carry, source)
        }
        reader.releaseLock()
      }
    }

    void readStream(child.stdout, 'stdout')
    void readStream(child.stderr, 'stderr')
  }

  /** Parse one bridge output line into the ring buffer and fan out to subscribers. */
  private ingestLine(rawLine: string, source: 'stdout' | 'stderr'): void {
    const line = rawLine.trimEnd()
    if (line.trim().length === 0) {
      return
    }

    let parsed: unknown
    try {
      parsed = JSON.parse(line)
    } catch {
      parsed = undefined
    }

    let entry: BridgeLogEntry
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      typeof (parsed as { msg?: unknown }).msg === 'string'
    ) {
      const { level, ts, msg, ...fields } = parsed as Record<string, unknown>
      entry = {
        seq: ++this.logSeq,
        source,
        level: this.normalizeLevel(level, source),
        ts: typeof ts === 'string' ? ts : new Date().toISOString(),
        msg: msg as string,
        fields: Object.keys(fields).length > 0 ? fields : undefined,
      }
    } else {
      entry = {
        seq: ++this.logSeq,
        source,
        level: source === 'stderr' ? 'error' : 'unknown',
        ts: new Date().toISOString(),
        msg: line,
        raw: line,
      }
    }

    this.logRing.push(entry)
    if (this.logRing.length > LOG_RING_MAX) {
      this.logRing.shift()
    }

    for (const sub of this.logSubscribers) {
      try {
        sub(entry)
      } catch {
        // One subscriber must not break ingestion or others.
      }
    }
  }

  private normalizeLevel(
    level: unknown,
    source: 'stdout' | 'stderr',
  ): BridgeLogEntry['level'] {
    if (
      level === 'debug' ||
      level === 'info' ||
      level === 'warn' ||
      level === 'error'
    ) {
      return level
    }
    return source === 'stderr' ? 'error' : 'unknown'
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
    return path.resolve(startDir, 'docker/docker-bridge')
  }

  private loadOrCreateSecret(): string {
    try {
      const existing = fs.readFileSync(BRIDGE_SECRET_PATH, 'utf-8').trim()
      if (existing.length >= 32) {
        this.logger.debug('Loaded bridge secret from disk')
        return existing
      }
    } catch {
      // Missing or unreadable: generate a new one.
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
}
