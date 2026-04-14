import type { ServerWebSocket } from 'bun'

import type { BridgeConfig } from '../config.js'
import type { AdapterPool } from '../docker/adapter-pool.js'
import { createDemuxer } from '../docker/demux.js'
import type { Logger } from '../logger.js'
import {
  type BodyChunkMsg,
  type BodyEndMsg,
  type Envelope,
  FrameType,
  type HTTPRequestMsg,
  type HTTPResponseMsg,
  type StreamCloseMsg,
  writeFrame,
  type WSDataMsg,
  type WSUpgradeAckMsg,
  type WSUpgradeMsg,
} from '../tunnel/protocol.types.js'
import { ProtocolParser } from '../tunnel/protocol-parser.js'
import { SessionConcurrencyLimiter, WriteSerializer } from './backpressure.js'
import type {
  SessionMode,
  TunnelProtocol,
  TunnelSession,
} from './session.types.js'
import type { SessionManager } from './session-manager.js'

/** Max body chunk size when streaming large request bodies (256KB) */
const MAX_BODY_CHUNK = 256 * 1024

export interface StreamEntry {
  ws: unknown // ServerWebSocket reference
  type: 'http' | 'ws'
  pendingBody?: Buffer[]
}

/**
 * Manages tunnel session lifecycle: creation, agent spawn, protocol parsing,
 * HTTP/WS proxying, heartbeat monitoring, and teardown.
 *
 * Supports two protocols:
 * - `framed`: binary framing protocol with a tunnel agent (HTTP/WS proxying)
 * - `raw`: raw PTY byte stream (terminal sessions)
 */
export class TunnelSessionHandler {
  private readonly adapterPool: AdapterPool
  private readonly sessionManager: SessionManager
  private readonly config: BridgeConfig
  private readonly logger: Logger
  private readonly limiter: SessionConcurrencyLimiter
  private readonly writeSerializer: WriteSerializer

  /** Per-session stream maps: sessionId -> (streamId -> StreamEntry) */
  private readonly sessionStreams = new Map<string, Map<string, StreamEntry>>()

  /** Pending direct HTTP responses (for tunnel traffic, not WS clients) */
  private readonly pendingHTTPResponses = new Map<
    string,
    {
      sessionId: string
      resolve: (resp: {
        statusCode: number
        headers: Record<string, string>
        body: Buffer | null
      }) => void
      reject: (err: Error) => void
      responseMeta: HTTPResponseMsg | null
      bodyChunks: Buffer[]
      /** True when the next binary frame should be captured by this pending response */
      expectingBinary: boolean
    }
  >()

  /** Per-session protocol parsers */
  private readonly parsers = new Map<string, ProtocolParser>()

  /** Per-session heartbeat timers */
  private readonly heartbeatTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >()

  /** Per-session last heartbeat timestamps */
  private readonly lastHeartbeats = new Map<string, number>()

  /** Per-session ready resolve/reject for initial handshake */
  private readonly readyWaiters = new Map<
    string,
    { resolve: () => void; reject: (err: Error) => void }
  >()

  /** Grace timers for ephemeral raw sessions (teardown after last client disconnects) */
  private readonly graceTimers = new Map<
    string,
    ReturnType<typeof setTimeout>
  >()

  /**
   * Stream ID of the next expected binary frame.
   * Set by TEXT frame handlers that indicate body_follows, consumed by handleAgentBinary.
   * Prevents iteration-order race when multiple streams expect binary data concurrently.
   */
  private nextBinaryStreamId: string | null = null

  constructor(
    adapterPool: AdapterPool,
    sessionManager: SessionManager,
    config: BridgeConfig,
    logger: Logger,
  ) {
    this.adapterPool = adapterPool
    this.sessionManager = sessionManager
    this.config = config
    this.logger = logger
    this.limiter = new SessionConcurrencyLimiter()
    this.writeSerializer = new WriteSerializer()
  }

  /**
   * Create a tunnel session.
   *
   * For `framed` protocol: spawns the agent eagerly (awaits ready).
   * For `raw` protocol: creates Docker exec but does not start it.
   */
  async create(
    hostId: string,
    containerId: string,
    command: string[],
    label: string,
    mode: SessionMode,
    protocol: TunnelProtocol,
    tty: boolean,
    options: {
      appIdentifier: string
      public?: boolean
    } | null,
  ): Promise<TunnelSession> {
    const session = this.sessionManager.create(
      hostId,
      containerId,
      command,
      label,
      {
        mode,
        protocol,
        tty,
        appIdentifier: options?.appIdentifier ?? null,
        isPublic: options?.public ?? false,
      },
    )

    // If this is an existing session (idempotent return), skip initialization
    if (session.state !== 'created') {
      return session
    }

    this.limiter.register(session.id, this.config.maxConcurrentPerSession)
    this.logger.info('Tunnel session created', {
      sessionId: session.id,
      containerId,
      publicId: session.publicId,
      label,
      appIdentifier: options?.appIdentifier ?? null,
      command: command.join(' '),
      mode,
      protocol,
      maxConcurrent: this.config.maxConcurrentPerSession,
    })

    if (protocol === 'framed') {
      // Spawn agent eagerly for framed sessions
      await this.spawnAgent(session)
    } else {
      // Raw: create Docker exec with tty=true but don't start it yet
      await this.createRawExec(session)
    }

    return session
  }

  /**
   * Attach a WebSocket client to a tunnel session.
   *
   * For `framed`: agent is already running from create; just adds the WS client.
   * For `raw`: adds WS client; starts exec on first attach (pipes raw bytes to all clients).
   */
  async attach(session: TunnelSession, ws: unknown): Promise<void> {
    // Cancel grace timer if pending (re-attach)
    const timer = this.graceTimers.get(session.id)
    if (timer) {
      clearTimeout(timer)
      this.graceTimers.delete(session.id)
    }

    session.clients.add(ws)
    this.sessionManager.touch(session.id)

    if (session.protocol === 'framed') {
      // Agent already spawned in create(); nothing else to do
    } else if (session.execStream === null) {
      // Raw: start exec on first attach
      await this.startRawExec(session)
    }
  }

  /**
   * Proxy an HTTP request from a WS client to the tunnel agent.
   * Only valid for framed protocol sessions.
   */
  async proxyHTTPRequest(
    session: TunnelSession,
    streamId: string,
    req: HTTPRequestMsg,
    body?: Buffer,
  ): Promise<void> {
    if (session.protocol !== 'framed') {
      throw new Error('proxyHTTPRequest only supported for framed protocol')
    }
    if (!session.execStream || !session.agentReady) {
      throw new Error('Tunnel agent not ready')
    }

    // Check concurrency limit -- return synthetic 429 if at capacity
    if (!this.limiter.acquire(session.id)) {
      this.logger.warn('Session concurrency limit reached, sending 429', {
        sessionId: session.id,
        streamId,
        inFlight: this.limiter.getInFlight(session.id),
      })

      // Send synthetic 429 response back to the WS client
      const wsClients = Array.from(session.clients)
      const ws = wsClients[wsClients.length - 1]
      if (ws) {
        const syntheticResponse: HTTPResponseMsg = {
          type: 'http_response',
          stream_id: streamId,
          status_code: 429,
          headers: { 'Retry-After': '1' },
        }
        this.sendToWS(ws, JSON.stringify(syntheticResponse))
      }
      return
    }

    // Register stream
    const streams = this.getStreamMap(session.id)
    // Find the ws client that sent this request -- use the last attached client
    const wsClients = Array.from(session.clients)
    const ws = wsClients[wsClients.length - 1]
    streams.set(streamId, { ws, type: 'http' })

    // Build the request message
    const msg: HTTPRequestMsg = {
      ...req,
      stream_id: streamId,
    }

    if (body && body.length > 0) {
      msg.body_len = body.length
      msg.body_follows = true
    }

    // Send TEXT frame with the request
    await writeFrame(
      session.execStream,
      FrameType.TEXT,
      Buffer.from(JSON.stringify(msg)),
    )

    // Send body if present
    if (body && body.length > 0) {
      if (body.length <= MAX_BODY_CHUNK) {
        await writeFrame(session.execStream, FrameType.BINARY, body)
      } else {
        // Chunk large bodies
        let offset = 0
        while (offset < body.length) {
          const end = Math.min(offset + MAX_BODY_CHUNK, body.length)
          const chunk = body.subarray(offset, end)
          const isLast = end >= body.length

          const chunkMsg: Envelope = {
            type: isLast ? 'body_end' : 'body_chunk',
            stream_id: streamId,
          }
          await writeFrame(
            session.execStream,
            FrameType.TEXT,
            Buffer.from(JSON.stringify(chunkMsg)),
          )
          await writeFrame(session.execStream, FrameType.BINARY, chunk)
          offset = end
        }
      }
    }

    this.sessionManager.touch(session.id)
  }

  /**
   * Proxy a WebSocket upgrade request to the tunnel agent.
   * Only valid for framed protocol sessions.
   */
  async proxyWSUpgrade(
    session: TunnelSession,
    streamId: string,
    msg: WSUpgradeMsg,
    ws: unknown,
  ): Promise<void> {
    if (session.protocol !== 'framed') {
      throw new Error('proxyWSUpgrade only supported for framed protocol')
    }
    if (!session.execStream || !session.agentReady) {
      throw new Error('Tunnel agent not ready')
    }

    const streams = this.getStreamMap(session.id)
    streams.set(streamId, { ws, type: 'ws' })

    const upgradeMsg: WSUpgradeMsg = {
      ...msg,
      stream_id: streamId,
    }

    await writeFrame(
      session.execStream,
      FrameType.TEXT,
      Buffer.from(JSON.stringify(upgradeMsg)),
    )

    this.sessionManager.touch(session.id)
  }

  /**
   * Forward WebSocket data from client to agent for a ws stream.
   * Only valid for framed protocol sessions.
   */
  async forwardWSData(
    session: TunnelSession,
    streamId: string,
    data: Buffer,
  ): Promise<void> {
    if (session.protocol !== 'framed') {
      throw new Error('forwardWSData only supported for framed protocol')
    }
    if (!session.execStream || !session.agentReady) {
      throw new Error('Tunnel agent not ready')
    }

    const wsDataMsg: WSDataMsg = {
      type: 'ws_data',
      stream_id: streamId,
      body_follows: true,
    }

    await writeFrame(
      session.execStream,
      FrameType.TEXT,
      Buffer.from(JSON.stringify(wsDataMsg)),
    )
    await writeFrame(session.execStream, FrameType.BINARY, data)

    this.sessionManager.touch(session.id)
  }

  /**
   * Proxy an HTTP request directly (from nginx tunnel traffic, not a WS client).
   * Returns a Promise that resolves with the full HTTP response from the agent.
   * Only valid for framed protocol sessions.
   */
  async proxyHTTPDirect(
    session: TunnelSession,
    method: string,
    path: string,
    headers: Record<string, string>,
    body: Buffer | null,
  ): Promise<{
    statusCode: number
    headers: Record<string, string>
    body: Buffer | null
  }> {
    if (session.protocol !== 'framed') {
      throw new Error('proxyHTTPDirect only supported for framed protocol')
    }
    if (!session.execStream || !session.agentReady) {
      throw new Error('Tunnel agent not ready')
    }

    // Check concurrency limit
    if (!this.limiter.acquire(session.id)) {
      return {
        statusCode: 429,
        headers: { 'Retry-After': '1' },
        body: Buffer.from(JSON.stringify({ error: 'too_many_requests' })),
      }
    }

    const streamId = crypto.randomUUID()

    const msg: HTTPRequestMsg = {
      type: 'http_request',
      stream_id: streamId,
      method,
      path,
      headers,
      body_follows: !!(body && body.length > 0),
    }

    if (body && body.length > 0) {
      msg.body_len = body.length
    }

    return new Promise<{
      statusCode: number
      headers: Record<string, string>
      body: Buffer | null
    }>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingHTTPResponses.delete(streamId)
        this.limiter.release(session.id)
        reject(new Error('Tunnel proxy timeout (30s)'))
      }, 30_000)

      this.pendingHTTPResponses.set(streamId, {
        sessionId: session.id,
        resolve: (resp) => {
          clearTimeout(timeout)
          this.limiter.release(session.id)
          resolve(resp)
        },
        reject: (err) => {
          clearTimeout(timeout)
          this.limiter.release(session.id)
          reject(err)
        },
        responseMeta: null,
        bodyChunks: [],
        expectingBinary: false,
      })

      // Send request to agent
      const execStream = session.execStream
      const sendRequest = async (): Promise<void> => {
        if (!execStream) {
          return
        }
        await writeFrame(
          execStream,
          FrameType.TEXT,
          Buffer.from(JSON.stringify(msg)),
        )

        if (body && body.length > 0) {
          if (body.length <= MAX_BODY_CHUNK) {
            await writeFrame(execStream, FrameType.BINARY, body)
          } else {
            let offset = 0
            while (offset < body.length) {
              const end = Math.min(offset + MAX_BODY_CHUNK, body.length)
              const chunk = body.subarray(offset, end)
              const isLast = end >= body.length
              const chunkMsg: Envelope = {
                type: isLast ? 'body_end' : 'body_chunk',
                stream_id: streamId,
              }
              await writeFrame(
                execStream,
                FrameType.TEXT,
                Buffer.from(JSON.stringify(chunkMsg)),
              )
              await writeFrame(execStream, FrameType.BINARY, chunk)
              offset = end
            }
          }
        }
      }

      sendRequest().catch((err: unknown) => {
        this.pendingHTTPResponses.delete(streamId)
        clearTimeout(timeout)
        this.limiter.release(session.id)
        reject(err instanceof Error ? err : new Error(String(err)))
      })

      this.sessionManager.touch(session.id)
    })
  }

  /**
   * Detach a WebSocket client from a tunnel session.
   * Persistent mode: does NOT tear down on last client disconnect.
   * Ephemeral mode: tears down after grace period when last client disconnects.
   */
  detach(session: TunnelSession, ws: unknown): void {
    session.clients.delete(ws)

    // Clean up any streams owned by this ws client (framed only)
    if (session.protocol === 'framed') {
      const streams = this.getStreamMap(session.id)
      for (const [streamId, entry] of streams) {
        if (entry.ws === ws) {
          // Release concurrency slot for in-flight HTTP requests
          if (entry.type === 'http') {
            this.limiter.release(session.id)
          }
          streams.delete(streamId)
        }
      }
    }

    this.sessionManager.touch(session.id)
    this.logger.debug('Client detached from tunnel session', {
      sessionId: session.id,
      protocol: session.protocol,
      remainingClients: session.clients.size,
    })

    // Ephemeral mode: tear down when last client disconnects
    if (session.mode === 'ephemeral' && session.clients.size === 0) {
      this.logger.info('Starting ephemeral grace period', {
        sessionId: session.id,
        gracePeriodMs: this.config.ephemeralGracePeriod,
      })

      const graceTimer = setTimeout(() => {
        this.graceTimers.delete(session.id)
        if (session.clients.size === 0 && session.state !== 'closing') {
          this.logger.info('Ephemeral grace period expired, tearing down', {
            sessionId: session.id,
          })
          this.teardown(session).catch((err) =>
            this.logger.error('Ephemeral tunnel teardown error', {
              sessionId: session.id,
              error: err instanceof Error ? err.message : String(err),
            }),
          )
        }
      }, this.config.ephemeralGracePeriod)

      this.graceTimers.set(session.id, graceTimer)
    }
  }

  /**
   * Resize the terminal for a raw protocol session.
   * Only valid for raw protocol sessions.
   */
  async resize(
    session: TunnelSession,
    cols: number,
    rows: number,
  ): Promise<void> {
    if (session.protocol !== 'raw') {
      throw new Error('Resize only supported for raw protocol sessions')
    }
    if (!session.execId) {
      throw new Error('Session has no execId')
    }

    const adapter = this.adapterPool.get(session.hostId)
    await adapter.resizeExec(session.execId, cols, rows)

    this.logger.debug('Session resized', {
      sessionId: session.id,
      cols,
      rows,
    })
  }

  /**
   * Write raw bytes to the exec stdin (for raw protocol sessions).
   */
  writeToExec(session: TunnelSession, data: Buffer | Uint8Array): void {
    if (session.protocol !== 'raw') {
      throw new Error('writeToExec only supported for raw protocol sessions')
    }
    if (session.execStream && !session.execStream.destroyed) {
      session.execStream.write(data)
    }
  }

  /**
   * Tear down a tunnel session: close all streams, kill agent, clean up.
   */
  async teardown(session: TunnelSession): Promise<void> {
    this.logger.info('Tearing down tunnel session', {
      sessionId: session.id,
      protocol: session.protocol,
    })

    session.state = 'closing'

    // Cancel grace timer
    const graceTimer = this.graceTimers.get(session.id)
    if (graceTimer) {
      clearTimeout(graceTimer)
      this.graceTimers.delete(session.id)
    }

    if (session.protocol === 'framed') {
      // Send stream_close for all active streams
      const streams = this.getStreamMap(session.id)
      if (session.execStream && streams.size > 0) {
        for (const [streamId] of streams) {
          try {
            const closeMsg: StreamCloseMsg = {
              type: 'stream_close',
              stream_id: streamId,
              reason: 'session teardown',
            }
            await writeFrame(
              session.execStream,
              FrameType.TEXT,
              Buffer.from(JSON.stringify(closeMsg)),
            )
          } catch {
            // Best effort
          }
        }
      }
      streams.clear()

      // Close exec stdin to signal agent to shut down
      if (session.execStream) {
        try {
          session.execStream.end()
        } catch {
          // Ignore
        }
      }

      // Kill exec if still running
      if (session.execId) {
        try {
          const adapter = this.adapterPool.get(session.hostId)
          const inspect = await adapter.inspectExec(session.execId)
          if (inspect.running) {
            await adapter.killExec(session.containerId, inspect.pid)
          }
        } catch {
          // Best effort
        }
      }

      // Reject all pending direct HTTP responses belonging to this session
      for (const [streamId, pending] of this.pendingHTTPResponses) {
        if (pending.sessionId === session.id) {
          this.pendingHTTPResponses.delete(streamId)
          pending.reject(new Error('Session torn down'))
        }
      }

      // Clean up framed-specific state
      this.clearHeartbeatTimer(session.id)
      this.parsers.delete(session.id)
      this.sessionStreams.delete(session.id)
      this.readyWaiters.delete(session.id)
      this.lastHeartbeats.delete(session.id)

      // Close all connected WebSocket clients
      for (const client of session.clients) {
        try {
          ;(client as ServerWebSocket<unknown>).close(
            1000,
            'Session terminated',
          )
        } catch {
          // Client may already be disconnected
        }
      }
      session.clients.clear()
    } else {
      // Raw protocol teardown
      // Close exec stream
      if (session.execStream) {
        try {
          session.execStream.destroy()
        } catch {
          // Ignore stream close errors
        }
      }

      // Try to kill exec process
      if (session.execId) {
        try {
          const adapter = this.adapterPool.get(session.hostId)
          const info = await adapter.inspectExec(session.execId)
          if (info.running && info.pid > 0) {
            await adapter.killExec(session.containerId, info.pid)
          }
        } catch {
          // Exec may already be gone
        }
      }

      // Close all connected WebSocket clients
      for (const client of session.clients) {
        try {
          ;(client as ServerWebSocket<unknown>).close(
            1000,
            'Session terminated',
          )
        } catch {
          // Client may already be disconnected
        }
      }
      session.clients.clear()
    }

    // Common cleanup
    this.limiter.unregister(session.id)
    this.writeSerializer.remove(session.id)

    // Delete session from manager
    this.sessionManager.delete(session.id)

    this.logger.info('Tunnel session torn down', { sessionId: session.id })
  }

  /**
   * Handle a parsed message from the tunnel agent (framed protocol only).
   */
  handleAgentMessage(session: TunnelSession, msg: Envelope): void {
    this.sessionManager.touch(session.id)

    switch (msg.type) {
      case 'ready':
        this.handleReady(session)
        break
      case 'heartbeat':
        this.handleHeartbeat(session)
        break
      case 'http_response':
        this.forwardToClient(session, msg as HTTPResponseMsg)
        break
      case 'ws_upgrade_ack':
        this.forwardToClient(session, msg as WSUpgradeAckMsg)
        break
      case 'ws_data':
        this.forwardToClient(session, msg as WSDataMsg)
        break
      case 'stream_close':
        this.handleStreamClose(session, msg as StreamCloseMsg)
        break
      case 'body_chunk':
        this.handleBodyChunk(session, msg as BodyChunkMsg)
        break
      case 'body_end':
        this.handleBodyEnd(session, msg as BodyEndMsg)
        break
      case 'http_request':
      case 'ws_upgrade':
        // These are client-to-agent message types; should not come from agent
        this.logger.warn('Unexpected client message type from agent', {
          sessionId: session.id,
          type: msg.type,
        })
        break
      default:
        this.logger.warn('Unknown agent message type', {
          sessionId: session.id,
          type: msg.type,
        })
    }
  }

  /**
   * Handle a binary payload from the agent (body data for a stream).
   * Routes to pending direct HTTP responses or to WS clients.
   *
   * Uses `nextBinaryStreamId` set by the preceding TEXT frame handler
   * to avoid iteration-order race conditions when multiple streams are
   * concurrently expecting binary data.
   */
  handleAgentBinary(session: TunnelSession, data: Buffer): void {
    const streamId = this.nextBinaryStreamId
    this.nextBinaryStreamId = null

    if (streamId) {
      const pending = this.pendingHTTPResponses.get(streamId)
      if (pending?.expectingBinary) {
        pending.expectingBinary = false
        pending.bodyChunks.push(data)

        // Single-body response (body_follows on http_response, not chunked) — resolve now
        // Chunked responses resolve in handleBodyEnd
        if (
          pending.responseMeta?.body_follows &&
          pending.bodyChunks.length === 1
        ) {
          this.pendingHTTPResponses.delete(streamId)
          pending.resolve({
            statusCode: pending.responseMeta.status_code,
            headers: pending.responseMeta.headers,
            body: Buffer.concat(pending.bodyChunks),
          })
        }
        return
      }
    }

    // Route to specific stream client if streamId is known (ws_data from agent)
    if (streamId) {
      const streams = this.getStreamMap(session.id)
      const entry = streams.get(streamId)
      if (entry) {
        this.sendToWSSerialized(session.id, entry.ws, data)
        return
      }
    }

    // Fallback: broadcast to all WS clients (raw protocol or unknown stream)
    for (const ws of session.clients) {
      this.sendToWSSerialized(session.id, ws, data)
    }
  }

  // --- Private methods ---

  private async spawnAgent(session: TunnelSession): Promise<void> {
    this.logger.info('Spawning tunnel command', {
      sessionId: session.id,
      containerId: session.containerId,
      command: session.command.join(' '),
    })

    // Create exec -- Tty=false because stdin/stdout is binary protocol
    const adapter = this.adapterPool.get(session.hostId)
    const execId = await adapter.createExec(
      session.containerId,
      session.command,
      { tty: false },
    )
    session.execId = execId

    // Start exec with stdin enabled
    const execStream = await adapter.startExec(execId, {
      tty: false,
      stdin: true,
    })
    session.execStream = execStream

    // Set up protocol parser
    const parser = new ProtocolParser({
      onMessage: (msg) => this.handleAgentMessage(session, msg),
      onBinary: (data) => this.handleAgentBinary(session, data),
      onError: (err) =>
        this.logger.error('Protocol parse error', {
          sessionId: session.id,
          error: err.message,
        }),
    })
    this.parsers.set(session.id, parser)

    // Set up demuxer: stdout -> protocol parser, stderr -> logs
    const demux = createDemuxer(
      (stdout) => parser.feed(stdout),
      (stderr) =>
        this.logger.warn('Agent stderr', {
          sessionId: session.id,
          output: stderr.toString('utf8').trim(),
        }),
    )

    // Pipe exec stream through demuxer
    execStream.on('data', (chunk: Buffer) => demux(chunk))
    const spawnedAt = Date.now()
    execStream.on('end', () => {
      const aliveMs = Date.now() - spawnedAt
      if (session.state !== 'closing') {
        // Agent died unexpectedly
        this.logger.error('Tunnel exec died unexpectedly', {
          sessionId: session.id,
          command: session.command.join(' '),
          aliveMs,
          hint:
            aliveMs < 500
              ? 'Process exited almost immediately — binary may be missing or crashing on startup. Check stderr above.'
              : undefined,
        })
        this.clearHeartbeatTimer(session.id)
        this.teardown(session).catch((err) =>
          this.logger.error('Teardown error after exec end', {
            sessionId: session.id,
            error: err instanceof Error ? err.message : String(err),
          }),
        )
      } else {
        this.logger.info('Tunnel exec stream ended', {
          sessionId: session.id,
          aliveMs,
        })
        this.clearHeartbeatTimer(session.id)
      }
    })
    execStream.on('error', (err: Error) => {
      this.logger.error('Agent exec stream error', {
        sessionId: session.id,
        error: err.message,
      })
    })

    // Wait for ready message with 10s timeout
    await this.waitForReady(session, 10_000)
  }

  /**
   * Create a Docker exec for raw protocol sessions.
   * Does not start the exec — that happens on first attach.
   */
  private async createRawExec(session: TunnelSession): Promise<void> {
    const adapter = this.adapterPool.get(session.hostId)
    const execId = await adapter.createExec(
      session.containerId,
      session.command,
      { tty: session.tty },
    )
    session.execId = execId

    this.logger.info('Raw exec created', {
      sessionId: session.id,
      containerId: session.containerId,
      execId,
    })
  }

  /**
   * Start the raw exec and pipe output to all connected WS clients.
   * Called on first WS attach for raw protocol sessions.
   *
   * For tty=true: raw bytes piped directly (merged stdout/stderr).
   * For tty=false: Docker's 8-byte multiplexed stream is demuxed.
   *   Each WS message is prefixed with a 1-byte stream type:
   *   0x01 = stdout, 0x02 = stderr.
   */
  private async startRawExec(session: TunnelSession): Promise<void> {
    const execId = session.execId
    if (!execId) {
      throw new Error('Session has no execId')
    }

    const adapter = this.adapterPool.get(session.hostId)
    const socket = await adapter.startExec(execId, {
      tty: session.tty,
      stdin: true,
    })

    session.execStream = socket
    session.state = 'active'

    const broadcast = (data: Buffer) => {
      for (const client of session.clients) {
        try {
          ;(client as ServerWebSocket<unknown>).sendBinary(data)
        } catch {
          // Client may have disconnected
        }
      }
    }

    if (session.tty) {
      // TTY mode: raw bytes, pipe directly
      socket.on('data', (chunk: Buffer) => broadcast(chunk))
    } else {
      // Pipe mode: demux Docker's 8-byte header protocol.
      // Prefix each WS message with stream type byte (0x01=stdout, 0x02=stderr).
      let pending = Buffer.alloc(0)

      socket.on('data', (chunk: Buffer) => {
        pending = Buffer.concat([pending, chunk])

        while (pending.length >= 8) {
          const streamType = pending[0] // 1=stdout, 2=stderr
          const length = pending.readUInt32BE(4)
          if (pending.length < 8 + length) {
            break
          }

          const payload = pending.subarray(8, 8 + length)
          const typed = Buffer.alloc(1 + payload.length)
          typed[0] = streamType
          payload.copy(typed, 1)
          broadcast(typed)

          pending = pending.subarray(8 + length)
        }
      })
    }

    socket.on('end', () => this.handleExecEnd(session))
    socket.on('error', (err: Error) => {
      this.logger.error('Exec stream error', {
        sessionId: session.id,
        error: err.message,
      })
      this.handleExecEnd(session)
    })

    this.logger.info('Raw exec started', {
      sessionId: session.id,
      execId,
      tty: session.tty,
    })
  }

  /**
   * Handle exec stream ending for raw protocol sessions.
   */
  private handleExecEnd(session: TunnelSession): void {
    if (session.state === 'closing') {
      return
    }

    this.logger.info('Exec stream ended', { sessionId: session.id })
    session.state = 'closing'

    // Notify all clients
    for (const client of session.clients) {
      try {
        ;(client as ServerWebSocket<unknown>).close(1000, 'Process exited')
      } catch {
        // Ignore
      }
    }
    session.clients.clear()

    // Clean up backpressure state
    this.limiter.unregister(session.id)
    this.writeSerializer.remove(session.id)

    this.sessionManager.delete(session.id)
  }

  private waitForReady(
    session: TunnelSession,
    timeoutMs: number,
  ): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => {
        this.readyWaiters.delete(session.id)
        const err = new Error('Tunnel agent ready timeout')
        ;(err as Error & { statusCode: number }).statusCode = 503
        reject(err)
      }, timeoutMs)

      this.readyWaiters.set(session.id, {
        resolve: () => {
          clearTimeout(timer)
          resolve()
        },
        reject: (err) => {
          clearTimeout(timer)
          reject(err)
        },
      })
    })
  }

  private handleReady(session: TunnelSession): void {
    session.agentReady = true
    session.state = 'active'

    this.logger.info('Tunnel agent ready', { sessionId: session.id })

    // Resolve the ready waiter
    const waiter = this.readyWaiters.get(session.id)
    if (waiter) {
      this.readyWaiters.delete(session.id)
      waiter.resolve()
    }

    // Start heartbeat monitoring
    this.resetHeartbeatTimer(session)
  }

  private handleHeartbeat(session: TunnelSession): void {
    this.lastHeartbeats.set(session.id, Date.now())
    this.resetHeartbeatTimer(session)
  }

  private resetHeartbeatTimer(session: TunnelSession): void {
    this.clearHeartbeatTimer(session.id)

    const timer = setTimeout(() => {
      this.logger.error('Dead tunnel agent detected (no heartbeat)', {
        sessionId: session.id,
        lastHeartbeat: this.lastHeartbeats.get(session.id),
      })
      this.teardown(session).catch((err) =>
        this.logger.error('Teardown error after dead agent', {
          sessionId: session.id,
          error: err instanceof Error ? err.message : String(err),
        }),
      )
    }, 15_000) // 15s dead agent timeout

    this.heartbeatTimers.set(session.id, timer)
  }

  private clearHeartbeatTimer(sessionId: string): void {
    const timer = this.heartbeatTimers.get(sessionId)
    if (timer) {
      clearTimeout(timer)
      this.heartbeatTimers.delete(sessionId)
    }
  }

  private forwardToClient(session: TunnelSession, msg: Envelope): void {
    if (!msg.stream_id) {
      return
    }

    // Check if this is a pending direct HTTP response
    const pending = this.pendingHTTPResponses.get(msg.stream_id)
    if (pending && msg.type === 'http_response') {
      const httpMsg = msg as HTTPResponseMsg
      if (httpMsg.body_follows) {
        pending.responseMeta = httpMsg
        pending.expectingBinary = true
        this.nextBinaryStreamId = msg.stream_id
      } else {
        this.pendingHTTPResponses.delete(msg.stream_id)
        pending.resolve({
          statusCode: httpMsg.status_code,
          headers: httpMsg.headers,
          body: null,
        })
      }
      return
    }

    // For ws_data with body_follows, set nextBinaryStreamId so the subsequent
    // binary frame is routed to the correct stream's client (not broadcast).
    if (msg.type === 'ws_data' && (msg as WSDataMsg).body_follows) {
      this.nextBinaryStreamId = msg.stream_id
    }

    const streams = this.getStreamMap(session.id)
    const entry = streams.get(msg.stream_id)
    if (!entry) {
      this.logger.warn('No stream found for agent message', {
        sessionId: session.id,
        streamId: msg.stream_id,
        type: msg.type,
      })
      return
    }

    this.sendToWSSerialized(session.id, entry.ws, JSON.stringify(msg))

    // For HTTP responses without body_follows, clean up the stream and release limiter
    if (
      msg.type === 'http_response' &&
      !(msg as HTTPResponseMsg).body_follows
    ) {
      if (entry.type === 'http') {
        this.limiter.release(session.id)
      }
      streams.delete(msg.stream_id)
    }
  }

  private handleStreamClose(session: TunnelSession, msg: StreamCloseMsg): void {
    if (!msg.stream_id) {
      return
    }

    // Check pending direct HTTP responses
    const pending = this.pendingHTTPResponses.get(msg.stream_id)
    if (pending) {
      this.pendingHTTPResponses.delete(msg.stream_id)
      pending.reject(new Error(`Stream closed: ${msg.reason ?? 'unknown'}`))
      return
    }

    const streams = this.getStreamMap(session.id)
    const entry = streams.get(msg.stream_id)
    if (entry) {
      this.sendToWSSerialized(session.id, entry.ws, JSON.stringify(msg))
      if (entry.type === 'http') {
        this.limiter.release(session.id)
      }
      streams.delete(msg.stream_id)
    }
  }

  private handleBodyChunk(session: TunnelSession, msg: BodyChunkMsg): void {
    if (!msg.stream_id) {
      return
    }

    // Direct HTTP responses accumulate chunks — next binary goes to this pending response
    const pending = this.pendingHTTPResponses.get(msg.stream_id)
    if (pending) {
      pending.expectingBinary = true
      this.nextBinaryStreamId = msg.stream_id
      return
    }

    const streams = this.getStreamMap(session.id)
    const entry = streams.get(msg.stream_id)
    if (entry) {
      if (!entry.pendingBody) {
        entry.pendingBody = []
      }
      // Set nextBinaryStreamId so the subsequent binary frame is routed to
      // this stream's client rather than broadcast to all clients.
      this.nextBinaryStreamId = msg.stream_id
      this.sendToWSSerialized(session.id, entry.ws, JSON.stringify(msg))
    }
  }

  private handleBodyEnd(session: TunnelSession, msg: BodyEndMsg): void {
    if (!msg.stream_id) {
      return
    }

    // Direct HTTP responses: resolve with accumulated body
    const pending = this.pendingHTTPResponses.get(msg.stream_id)
    if (pending) {
      this.pendingHTTPResponses.delete(msg.stream_id)
      const body =
        pending.bodyChunks.length > 0 ? Buffer.concat(pending.bodyChunks) : null
      pending.resolve({
        statusCode: pending.responseMeta?.status_code ?? 200,
        headers: pending.responseMeta?.headers ?? {},
        body,
      })
      return
    }

    const streams = this.getStreamMap(session.id)
    const entry = streams.get(msg.stream_id)
    if (entry) {
      this.sendToWSSerialized(session.id, entry.ws, JSON.stringify(msg))
      if (entry.type === 'http') {
        this.limiter.release(session.id)
        streams.delete(msg.stream_id)
      }
    }
  }

  private getStreamMap(sessionId: string): Map<string, StreamEntry> {
    let streams = this.sessionStreams.get(sessionId)
    if (!streams) {
      streams = new Map()
      this.sessionStreams.set(sessionId, streams)
    }
    return streams
  }

  /** Get the write serializer (for use by ws-server). */
  getWriteSerializer(): WriteSerializer {
    return this.writeSerializer
  }

  /**
   * Send data to a WebSocket via the write serializer.
   * Serialization prevents interleaved frames across concurrent streams.
   */
  sendToWS(ws: unknown, data: string | Buffer): void {
    try {
      const wsAny = ws as { send: (data: string | Buffer) => void }
      if (typeof wsAny.send !== 'function') {
        return
      }

      // We don't have the session id in this context, so use a direct send.
      // The serializer is used at the higher level (forwardToClient / handleAgentBinary).
      wsAny.send(data)
    } catch (err) {
      this.logger.debug('Failed to send to WS client', {
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  /**
   * Send data to a WebSocket via the write serializer for a specific session.
   * This is the serialized variant that prevents frame interleaving.
   */
  sendToWSSerialized(
    sessionId: string,
    ws: unknown,
    data: string | Buffer,
  ): void {
    const wsAny = ws as { send: (data: string | Buffer) => void }
    if (typeof wsAny.send !== 'function') {
      return
    }

    const write = this.writeSerializer.getWriter(sessionId)
    write(wsAny, data).catch((err) => {
      this.logger.debug('Serialized WS write failed', {
        sessionId,
        error: err instanceof Error ? err.message : String(err),
      })
    })
  }
}
