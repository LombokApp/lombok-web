import type {
  Session,
  SessionMode,
  TunnelProtocol,
  TunnelSession,
} from './session.types.js'

export class SessionManager {
  private readonly sessions = new Map<string, Session>()
  private readonly tunnelIndex = new Map<string, string>() // publicId -> sessionId
  private sweepTimer: ReturnType<typeof setInterval> | null = null
  private readonly maxSessions: number
  private readonly sessionIdleTimeout: number

  constructor(opts: { maxSessions: number; sessionIdleTimeout: number }) {
    this.maxSessions = opts.maxSessions
    this.sessionIdleTimeout = opts.sessionIdleTimeout
  }

  private generateId(): string {
    return 'sess_' + crypto.randomUUID().replace(/-/g, '').slice(0, 21)
  }

  // The `tn-` prefix puts a hyphen inside the publicId — that hyphen
  // partitions publicIds from app/worker identifiers (which are [a-z0-9_]+),
  // so tunnel hostnames cannot collide with api-server--{worker}--{app}
  // or app-server--{name} patterns.
  private generatePublicId(): string {
    for (let i = 0; i < 10; i++) {
      const id = 'tn-' + crypto.randomUUID().replace(/-/g, '').slice(0, 10)
      if (!this.tunnelIndex.has(id)) {
        return id
      }
    }
    throw new Error('Failed to generate unique public ID')
  }

  // A caller-supplied (durable) publicId must match the same tunnel hostname
  // shape generatePublicId() produces: a `tn-` prefix followed by [a-z0-9-].
  private static readonly PUBLIC_ID_SHAPE = /^tn-[a-z0-9-]+$/

  private resolvePublicId(opts: {
    isPublic: boolean
    desiredPublicId?: string | null
    durable?: boolean
  }): string | null {
    if (!opts.isPublic) {
      return null
    }
    if (opts.desiredPublicId) {
      if (!SessionManager.PUBLIC_ID_SHAPE.test(opts.desiredPublicId)) {
        const err = new Error('Invalid public_id shape')
        ;(err as Error & { statusCode: number }).statusCode = 400
        throw err
      }
      return opts.desiredPublicId
    }
    return this.generatePublicId()
  }

  create(
    hostId: string,
    containerId: string,
    command: string[],
    label: string,
    options: {
      appId: string | null
      mode: SessionMode
      protocol: TunnelProtocol
      tty: boolean
      isPublic: boolean
      desiredPublicId?: string | null
      durable?: boolean
    },
  ): TunnelSession {
    const durable = options.durable ?? false

    // Idempotent durable create: a repeated desiredPublicId returns the live
    // session, making bridge-reconnect replay and concurrent ensureLive safe.
    if (durable && options.desiredPublicId) {
      const existing = this.getByPublicId(options.desiredPublicId)
      if (existing) {
        return existing
      }
    }

    if (this.sessions.size >= this.maxSessions) {
      const err = new Error('Maximum session limit reached')
      ;(err as Error & { statusCode: number }).statusCode = 503
      throw err
    }

    const publicId = this.resolvePublicId({
      isPublic: options.isPublic,
      desiredPublicId: options.desiredPublicId,
      durable,
    })

    const now = Date.now()
    const session: TunnelSession = {
      id: this.generateId(),
      containerId,
      hostId,
      mode: options.mode,
      state: 'created',
      createdAt: now,
      lastActivityAt: now,
      clients: new Set(),
      execId: null,
      execStream: null,
      command: [...command],
      protocol: options.protocol,
      tty: options.tty,
      agentReady: false,
      publicId,
      label,
      appId: options.appId,
      durable,
    }

    this.sessions.set(session.id, session)
    if (publicId) {
      this.tunnelIndex.set(publicId, session.id)
    }
    return session
  }

  get(sessionId: string): Session | undefined {
    return this.sessions.get(sessionId)
  }

  getByPublicId(publicId: string): TunnelSession | undefined {
    const sessionId = this.tunnelIndex.get(publicId)
    if (!sessionId) {
      return undefined
    }
    return this.sessions.get(sessionId)
  }

  list(filter?: { containerId?: string; appId?: string }): Session[] {
    let results = Array.from(this.sessions.values())

    if (filter?.containerId) {
      results = results.filter((s) => s.containerId === filter.containerId)
    }

    if (filter?.appId) {
      results = results.filter((s) => s.appId === filter.appId)
    }

    return results
  }

  delete(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (!session) {
      return
    }

    // Close exec stream if active
    if (session.execStream) {
      try {
        session.execStream.destroy()
      } catch {
        // Ignore stream close errors
      }
    }

    // Remove from tunnel index
    if (session.publicId) {
      this.tunnelIndex.delete(session.publicId)
    }

    this.sessions.delete(sessionId)
  }

  touch(sessionId: string): void {
    const session = this.sessions.get(sessionId)
    if (session) {
      session.lastActivityAt = Date.now()
    }
  }

  get size(): number {
    return this.sessions.size
  }

  startSweep(interval: number): void {
    this.sweepTimer = setInterval(() => {
      const now = Date.now()
      const toDelete: string[] = []

      for (const [id, session] of this.sessions) {
        // Durable sessions self-heal only via the platform (reconnect replay /
        // lazy re-bind); external traffic can't, so they are never swept.
        if (session.durable) {
          continue
        }

        // Remove sessions idle beyond timeout
        if (now - session.lastActivityAt > this.sessionIdleTimeout) {
          toDelete.push(id)
          continue
        }

        // Remove sessions in 'created' state older than 60s (creation timeout)
        if (session.state === 'created' && now - session.createdAt > 60_000) {
          toDelete.push(id)
        }
      }

      for (const id of toDelete) {
        this.delete(id)
      }
    }, interval)
  }

  stopSweep(): void {
    if (this.sweepTimer) {
      clearInterval(this.sweepTimer)
      this.sweepTimer = null
    }
  }
}
