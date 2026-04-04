/**
 * Per-session backpressure controls for the Docker Bridge.
 *
 * SessionConcurrencyLimiter: caps in-flight requests per session to prevent overload.
 * WriteSerializer: serializes WebSocket writes per session to prevent frame interleaving.
 */

/**
 * Per-session concurrency limiter. Prevents overwhelming a tunnel agent
 * with too many simultaneous requests.
 */
export class SessionConcurrencyLimiter {
  private readonly limiters = new Map<
    string,
    { inFlight: number; max: number }
  >()

  /** Register a session with a concurrency limit. */
  register(sessionId: string, max: number): void {
    this.limiters.set(sessionId, { inFlight: 0, max })
  }

  /** Unregister a session and clean up its state. */
  unregister(sessionId: string): void {
    this.limiters.delete(sessionId)
  }

  /**
   * Try to acquire a request slot.
   * Returns true if under the limit (slot acquired), false if at capacity.
   */
  acquire(sessionId: string): boolean {
    const entry = this.limiters.get(sessionId)
    if (!entry) {
      return false
    }
    if (entry.inFlight >= entry.max) {
      return false
    }
    entry.inFlight++
    return true
  }

  /** Release a request slot after completion. */
  release(sessionId: string): void {
    const entry = this.limiters.get(sessionId)
    if (!entry) {
      return
    }
    if (entry.inFlight > 0) {
      entry.inFlight--
    }
  }

  /** Get the current in-flight count for a session. */
  getInFlight(sessionId: string): number {
    const entry = this.limiters.get(sessionId)
    return entry ? entry.inFlight : 0
  }
}

/**
 * Per-session write serializer for WebSocket frames.
 *
 * Ensures that multi-frame sequences (e.g., JSON envelope + binary body)
 * from different concurrent streams are not interleaved. Uses a per-session
 * promise chain so that each write operation completes before the next begins.
 */
export class WriteSerializer {
  private readonly chains = new Map<string, Promise<void>>()

  /**
   * Get a serialized write function for a session.
   * Each call to the returned function is queued and executed in order.
   */
  getWriter(
    sessionId: string,
  ): (
    ws: { send: (data: string | Buffer) => void },
    data: string | Buffer,
  ) => Promise<void> {
    return (ws, data) => {
      const prev = this.chains.get(sessionId) ?? Promise.resolve()
      const next = prev.then(() => {
        ws.send(data)
      })
      // Swallow errors so the chain never rejects and blocks future writes
      this.chains.set(
        sessionId,
        next.catch(() => {
          /* swallow to keep chain alive */
        }),
      )
      return next
    }
  }

  /** Remove the chain for a session (cleanup on teardown). */
  remove(sessionId: string): void {
    this.chains.delete(sessionId)
  }
}
