import type { Server, ServerWebSocket } from 'bun'

import {
  authenticate,
  authenticateSessionToken,
  extractBearerToken,
} from './auth.js'
import type { BridgeConfig } from './config.js'
import type { Logger } from './logger.js'
import type { SessionManager } from './sessions/session-manager.js'
import type { TunnelSessionHandler } from './sessions/tunnel-session.js'

interface WSData {
  sessionId: string
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WsServer = Server<any>

export function createWsServer(
  config: BridgeConfig,
  sessionManager: SessionManager,
  tunnelHandler: TunnelSessionHandler,
  logger: Logger,
): WsServer {
  /**
   * Pending http_request envelopes that have body_follows=true.
   * Keyed by sessionId so the next binary message can be matched.
   */
  const pendingRequestBodies = new Map<
    string,
    { streamId: string; envelope: Record<string, unknown> }
  >()

  /** Quick check whether a Buffer is valid JSON (text message). */
  function isParsableJSON(data: Buffer | ArrayBuffer): boolean {
    const buf = Buffer.isBuffer(data) ? data : Buffer.from(data)
    if (buf.length === 0) {
      return false
    }
    // JSON envelopes always start with '{' (0x7b)
    return buf[0] === 0x7b
  }

  const server = Bun.serve<WSData>({
    port: config.wsPort,

    async fetch(req: Request, srv): Promise<Response | undefined> {
      const url = new URL(req.url)
      const path = url.pathname

      // Expect /sessions/:session_id/attach
      const match = path.match(/^\/sessions\/([^/]+)\/attach$/)
      if (!match) {
        return new Response(JSON.stringify({ error: 'Not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const sessionId = match[1]

      // Auth: try session-scoped JWT first, then fall back to static tokens
      const token = extractBearerToken(req, url)
      let authenticated = false

      if (token) {
        // Try session-scoped JWT (for direct client connections)
        const secret = config.bridgeApiSecret
        if (secret) {
          const jwtResult = await authenticateSessionToken(
            token,
            sessionId,
            secret,
          )
          if (jwtResult.valid) {
            authenticated = true
          }
        }

        // Fall back to static token auth (for backend-to-bridge connections)
        if (!authenticated) {
          const staticReq = new Request(req.url, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (authenticate(staticReq, config)) {
            authenticated = true
          }
        }
      }

      if (!authenticated) {
        return new Response(JSON.stringify({ error: 'Unauthorized' }), {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const session = sessionManager.get(sessionId)
      if (!session) {
        return new Response(JSON.stringify({ error: 'Session not found' }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        })
      }

      const upgraded = srv.upgrade(req, {
        data: {
          sessionId: session.id,
        },
      })

      if (!upgraded) {
        return new Response(
          JSON.stringify({ error: 'WebSocket upgrade failed' }),
          {
            status: 426,
            headers: { 'Content-Type': 'application/json' },
          },
        )
      }

      // Return undefined — Bun handles the upgrade
      return undefined
    },

    websocket: {
      open(ws: ServerWebSocket<WSData>) {
        const { sessionId } = ws.data
        const session = sessionManager.get(sessionId)
        if (!session) {
          logger.warn('WebSocket opened but session not found', { sessionId })
          ws.close(1008, 'Session not found')
          return
        }

        sessionManager.touch(sessionId)

        tunnelHandler.attach(session, ws).catch((err: unknown) => {
          const msg = err instanceof Error ? err.message : String(err)
          logger.error('Tunnel attach failed', { sessionId, error: msg })
          ws.close(1011, 'Attach failed')
        })
      },

      message(ws: ServerWebSocket<WSData>, message: string | Buffer) {
        const { sessionId } = ws.data
        const session = sessionManager.get(sessionId)
        if (!session) {
          return
        }

        sessionManager.touch(sessionId)

        if (session.protocol === 'raw') {
          // Raw protocol: forward raw bytes to exec stdin
          const data =
            typeof message === 'string'
              ? Buffer.from(message)
              : Buffer.from(message)
          tunnelHandler.writeToExec(session, data)
        } else {
          // Framed protocol: text (JSON envelopes) and binary (body data) messages.
          //
          // When an http_request has body_follows=true, the client sends the
          // body as a subsequent binary WS message. We buffer the pending
          // request envelope and dispatch it with the body once the binary
          // frame arrives.
          //
          // Priority: if there is a pending request body for this session,
          // consume the next non-string message as body data regardless of
          // content (the body may itself be valid JSON).
          const hasPendingBody = pendingRequestBodies.has(sessionId)
          const isBinary =
            typeof message !== 'string' &&
            (hasPendingBody || !isParsableJSON(message))

          if (isBinary) {
            // Binary message — body data for a pending http_request
            const pending = pendingRequestBodies.get(sessionId)
            if (pending) {
              pendingRequestBodies.delete(sessionId)
              const body = Buffer.from(message)
              tunnelHandler
                .proxyHTTPRequest(
                  session,
                  pending.streamId,
                  pending.envelope as unknown as Parameters<
                    typeof tunnelHandler.proxyHTTPRequest
                  >[2],
                  body,
                )
                .catch((err: unknown) => {
                  logger.error('Tunnel HTTP proxy failed', {
                    sessionId,
                    error: err instanceof Error ? err.message : String(err),
                  })
                })
            } else {
              logger.warn(
                'Unexpected binary message from client (no pending request)',
                { sessionId },
              )
            }
            return
          }

          // Text message — JSON envelope
          try {
            const text =
              typeof message === 'string'
                ? message
                : Buffer.from(message).toString('utf8')
            const envelope = JSON.parse(text) as {
              type: string
              stream_id?: string
              body_follows?: boolean
              [key: string]: unknown
            }

            if (envelope.type === 'http_request' && envelope.stream_id) {
              if (envelope.body_follows) {
                // Buffer the request — body will arrive as next binary message
                pendingRequestBodies.set(sessionId, {
                  streamId: envelope.stream_id,
                  envelope,
                })
              } else {
                // No body — dispatch immediately
                tunnelHandler
                  .proxyHTTPRequest(
                    session,
                    envelope.stream_id,
                    envelope as unknown as Parameters<
                      typeof tunnelHandler.proxyHTTPRequest
                    >[2],
                  )
                  .catch((err: unknown) => {
                    logger.error('Tunnel HTTP proxy failed', {
                      sessionId,
                      error: err instanceof Error ? err.message : String(err),
                    })
                  })
              }
            } else if (envelope.type === 'ws_upgrade' && envelope.stream_id) {
              tunnelHandler
                .proxyWSUpgrade(
                  session,
                  envelope.stream_id,
                  envelope as unknown as Parameters<
                    typeof tunnelHandler.proxyWSUpgrade
                  >[2],
                  ws,
                )
                .catch((err: unknown) => {
                  logger.error('Tunnel WS upgrade failed', {
                    sessionId,
                    error: err instanceof Error ? err.message : String(err),
                  })
                })
            } else if (envelope.type === 'ws_data' && envelope.stream_id) {
              // ws_data from client to agent (binary follows)
              tunnelHandler
                .forwardWSData(
                  session,
                  envelope.stream_id,
                  typeof message === 'string'
                    ? Buffer.from(message)
                    : Buffer.from(message),
                )
                .catch((err: unknown) => {
                  logger.error('Tunnel WS data forward failed', {
                    sessionId,
                    error: err instanceof Error ? err.message : String(err),
                  })
                })
            }
          } catch {
            logger.warn('Invalid tunnel message from client', { sessionId })
          }
        }
      },

      close(ws: ServerWebSocket<WSData>) {
        const { sessionId } = ws.data
        const session = sessionManager.get(sessionId)
        if (!session) {
          return
        }

        tunnelHandler.detach(session, ws)
      },

      drain(_ws: ServerWebSocket<WSData>) {
        // Backpressure relief — Bun automatically resumes sending
      },
    },
  })

  return server
}
