/**
 * Tunnel traffic handler.
 *
 * Handles HTTP requests forwarded by nginx for tunnel traffic:
 *   ALL /-/tunnel/* → authenticate → lookup tunnel session → proxy through agent
 *
 * Auth flow:
 *   - First-party (app UI): POST /-/tunnel/-/tunnel-auth with X-Tunnel-Token header
 *     → sets cookie, returns 204. Then open clean URL.
 *   - Third-party (shared link): GET /-/tunnel/?token=jwt
 *     → sets cookie, 302 redirects to clean URL (token stripped).
 *   - Subsequent requests: cookie sent automatically.
 *
 * nginx sets X-Tunnel-Public-Id header based on the subdomain:
 *   {label}--{publicId}--{appId}.apps.{domain}
 */

import type { BridgeConfig } from '../config.js'
import type { Logger } from '../logger.js'
import type { TunnelSession } from '../sessions/session.types.js'
import type { SessionManager } from '../sessions/session-manager.js'
import type { TunnelSessionHandler } from '../sessions/tunnel-session.js'
import { authenticateTunnel } from './tunnel-auth.js'

const HOP_BY_HOP_HEADERS = new Set([
  'connection',
  'keep-alive',
  'proxy-authenticate',
  'proxy-authorization',
  'te',
  'trailers',
  'transfer-encoding',
  'upgrade',
])

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

/**
 * Data attached to a tunnel traffic WebSocket upgrade.
 * Used by the HTTP server's websocket handler to proxy WS frames.
 */
export interface TunnelWSData {
  publicId: string
  forwardPath: string
  session: TunnelSession
  streamId: string
}

/**
 * Result when tunnel traffic detects a WebSocket upgrade request.
 * The caller (HTTP server) should call server.upgrade() with this data.
 */
export interface TunnelWSUpgradeRequest {
  type: 'ws-upgrade'
  data: TunnelWSData
}

export async function handleTunnelTraffic(
  req: Request,
  url: URL,
  config: BridgeConfig,
  sessionManager: SessionManager,
  tunnelHandler: TunnelSessionHandler,
  logger: Logger,
): Promise<Response | TunnelWSUpgradeRequest | null> {
  const path = url.pathname
  if (!path.startsWith('/-/tunnel/')) {
    return null
  }

  const forwardPath = path.slice('/-/tunnel'.length) || '/'
  const publicId = req.headers.get('X-Tunnel-Public-Id')

  if (!publicId) {
    return jsonResponse(
      {
        error: 'missing_headers',
        message: 'X-Tunnel-Public-Id header is required',
      },
      400,
    )
  }

  // ── Authenticate ───────────────────────────────────────────────────
  // Try header/cookie first, then fall back to query token. Track which source
  // was used so we only set the auth cookie when the query token was the actual source.
  const queryToken = url.searchParams.get('token')
  let auth = await authenticateTunnel(req, config)
  let authViaQueryToken = false
  if (!auth && queryToken) {
    auth = await authenticateTunnel(req, config, queryToken)
    authViaQueryToken = !!auth
  }
  if (!auth) {
    return jsonResponse(
      { error: 'unauthorized', message: 'Tunnel token missing or expired.' },
      401,
    )
  }

  if (auth.payload.public_id !== publicId) {
    return jsonResponse(
      { error: 'unauthorized', message: 'Token tunnel mismatch' },
      401,
    )
  }

  // ── Session lookup ─────────────────────────────────────────────────
  const session = sessionManager.getByPublicId(publicId)
  if (!session) {
    return jsonResponse(
      { error: 'session_unavailable', message: 'No active tunnel session.' },
      502,
    )
  }

  if (!session.agentReady) {
    return jsonResponse(
      { error: 'agent_not_ready', message: 'Tunnel agent is starting up.' },
      503,
    )
  }

  // ── WebSocket upgrade ──────────────────────────────────────────────
  if (req.headers.get('Upgrade')?.toLowerCase() === 'websocket') {
    const streamId = crypto.randomUUID()
    logger.info('Tunnel traffic WS upgrade', {
      publicId,
      path: forwardPath,
      streamId,
    })
    return {
      type: 'ws-upgrade',
      data: {
        publicId,
        forwardPath: forwardPath + url.search,
        session,
        streamId,
      },
    }
  }

  // ── Forward headers ────────────────────────────────────────────────
  const forwardHeaders: Record<string, string> = {}
  req.headers.forEach((value, key) => {
    const lower = key.toLowerCase()
    if (HOP_BY_HOP_HEADERS.has(lower)) {
      return
    }
    if (lower.startsWith('x-tunnel-')) {
      return
    }
    forwardHeaders[key] = value
  })

  // Read request body
  let body: Buffer | null = null
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const arrayBuf = await req.arrayBuffer()
    if (arrayBuf.byteLength > 0) {
      body = Buffer.from(arrayBuf)
    }
  }

  // ── Proxy through tunnel agent ─────────────────────────────────────
  const start = performance.now()
  let agentResponse: {
    statusCode: number
    headers: Record<string, string>
    body: Buffer | null
  }

  try {
    agentResponse = await tunnelHandler.proxyHTTPDirect(
      session,
      req.method,
      forwardPath + url.search,
      forwardHeaders,
      body,
    )
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    logger.error('Tunnel traffic proxy error', {
      publicId,
      path: forwardPath,
      error: msg,
    })
    return jsonResponse({ error: 'proxy_error', message: msg }, 502)
  }

  const duration = Math.round(performance.now() - start)
  logger.info('Tunnel traffic', {
    publicId,
    method: req.method,
    path: forwardPath,
    status: agentResponse.statusCode,
    ms: duration,
  })

  // Build response headers
  const responseHeaders = new Headers()
  for (const [key, value] of Object.entries(agentResponse.headers)) {
    if (!HOP_BY_HOP_HEADERS.has(key.toLowerCase())) {
      responseHeaders.set(key, value)
    }
  }

  const responseBody = agentResponse.body
    ? new Uint8Array(agentResponse.body)
    : null

  // Set auth cookie when authenticated via query token (first visit from shared link)
  if (authViaQueryToken && queryToken) {
    responseHeaders.set(
      'Set-Cookie',
      `tunnel_auth=${queryToken}; Path=/-/tunnel/; HttpOnly; SameSite=None; Secure`,
    )
  }

  return new Response(responseBody, {
    status: agentResponse.statusCode,
    headers: responseHeaders,
  })
}
