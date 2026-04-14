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

  private generatePublicId(): string {
    for (let i = 0; i < 10; i++) {
      const id = crypto.randomUUID().replace(/-/g, '').slice(0, 12)
      if (!this.tunnelIndex.has(id)) {
        return id
      }
    }
    throw new Error('Failed to generate unique public ID')
  }

  create(
    hostId: string,
    containerId: string,
    command: string[],
    label: string,
    options: {
      appIdentifier: string | null
      mode: SessionMode
      protocol: TunnelProtocol
      tty: boolean
      isPublic: boolean
    },
  ): TunnelSession {
    if (this.sessions.size >= this.maxSessions) {
      const err = new Error('Maximum session limit reached')
      ;(err as Error & { statusCode: number }).statusCode = 503
      throw err
    }

    const publicId = options.isPublic ? this.generatePublicId() : null

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
      appIdentifier: options.appIdentifier,
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

  list(filter?: { containerId?: string }): Session[] {
    let results = Array.from(this.sessions.values())

    if (filter?.containerId) {
      results = results.filter((s) => s.containerId === filter.containerId)
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
