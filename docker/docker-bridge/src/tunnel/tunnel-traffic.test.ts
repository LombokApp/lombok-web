import { describe, expect, it, mock } from 'bun:test'

import type { BridgeConfig } from '../config.js'
import type { Logger } from '../logger.js'
import type { TunnelSession } from '../sessions/session.types.js'
import type { SessionManager } from '../sessions/session-manager.js'
import type { TunnelSessionHandler } from '../sessions/tunnel-session.js'
import {
  handleTunnelTraffic,
  type TunnelWSUpgradeRequest,
} from './tunnel-traffic.js'

// --- Helpers ---

function makeConfig(overrides: Partial<BridgeConfig> = {}): BridgeConfig {
  return {
    httpPort: 3100,
    wsPort: 3101,
    bridgeApiSecret: 'test-secret',
    bridgeJwtSecret: 'test-tunnel-jwt-secret',
    bridgeJwtExpiry: 3600,
    dockerHosts: {
      default: { type: 'docker_endpoint', host: '/var/run/docker.sock' },
    },
    logLevel: 'info',
    maxSessions: 200,
    maxConcurrentPerSession: 100,
    sessionIdleTimeout: 1800000,
    ephemeralGracePeriod: 5000,
    ...overrides,
  }
}

function makeLogger(): Logger {
  return {
    info: mock(() => {
      void 0
    }),
    warn: mock(() => {
      void 0
    }),
    error: mock(() => {
      void 0
    }),
    debug: mock(() => {
      void 0
    }),
  }
}

function makeTunnelSession(
  overrides: Partial<TunnelSession> = {},
): TunnelSession {
  return {
    id: 'sess_test123',
    containerId: 'container-1',
    hostId: 'host-1',
    mode: 'persistent',
    state: 'active',
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    clients: new Set(),
    execId: 'exec-1',
    execStream: null,
    command: ['/usr/local/bin/tunnel-agent', '--ports', '3000'],
    protocol: 'framed',
    tty: false,
    agentReady: true,
    publicId: 'abc123xyz',
    label: 'preview',
    appId: 'coder',
    ...overrides,
  }
}

async function signJWT(
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder()
  const headerB64 = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${headerB64}.${payloadB64}`),
  )
  return `${headerB64}.${payloadB64}.${Buffer.from(new Uint8Array(sig)).toString('base64url')}`
}

async function makeAuthenticatedRequest(
  publicId: string,
  path = '/-/tunnel/',
  method = 'GET',
  extraHeaders: Record<string, string> = {},
): Promise<{ req: Request; url: URL }> {
  const now = Math.floor(Date.now() / 1000)
  const token = await signJWT(
    { public_id: publicId, iat: now, exp: now + 3600 },
    'test-tunnel-jwt-secret',
  )
  const urlStr = `http://localhost${path}?token=${token}`
  const req = new Request(urlStr, {
    method,
    headers: {
      'X-Tunnel-Public-Id': publicId,
      ...extraHeaders,
    },
  })
  return { req, url: new URL(urlStr) }
}

// --- Tests ---

describe('handleTunnelTraffic', () => {
  it('returns null for non-tunnel paths', async () => {
    const config = makeConfig()
    const logger = makeLogger()
    const req = new Request('http://localhost/health')
    const url = new URL(req.url)

    const result = await handleTunnelTraffic(
      req,
      url,
      config,
      {} as SessionManager,
      {} as TunnelSessionHandler,
      logger,
    )

    expect(result).toBeNull()
  })

  it('returns 400 when X-Tunnel-Public-Id header is missing', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await signJWT(
      { public_id: 'abc123', iat: now, exp: now + 3600 },
      'test-tunnel-jwt-secret',
    )
    const config = makeConfig()
    const logger = makeLogger()
    const req = new Request(`http://localhost/-/tunnel/?token=${token}`)
    const url = new URL(req.url)

    const result = await handleTunnelTraffic(
      req,
      url,
      config,
      {} as SessionManager,
      {} as TunnelSessionHandler,
      logger,
    )

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(400)
    const body = (await (result as Response).json()) as { error: string }
    expect(body.error).toBe('missing_headers')
  })

  it('returns 401 when token is missing', async () => {
    const config = makeConfig()
    const logger = makeLogger()
    const req = new Request('http://localhost/-/tunnel/', {
      headers: { 'X-Tunnel-Public-Id': 'abc123' },
    })
    const url = new URL(req.url)

    const result = await handleTunnelTraffic(
      req,
      url,
      config,
      {} as SessionManager,
      {} as TunnelSessionHandler,
      logger,
    )

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(401)
  })

  it('returns 401 when token public_id does not match header', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await signJWT(
      { public_id: 'different-tunnel', iat: now, exp: now + 3600 },
      'test-tunnel-jwt-secret',
    )
    const config = makeConfig()
    const logger = makeLogger()
    const req = new Request(`http://localhost/-/tunnel/?token=${token}`, {
      headers: { 'X-Tunnel-Public-Id': 'abc123' },
    })
    const url = new URL(req.url)

    const result = await handleTunnelTraffic(
      req,
      url,
      config,
      {} as SessionManager,
      {} as TunnelSessionHandler,
      logger,
    )

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(401)
    const body = (await (result as Response).json()) as { message: string }
    expect(body.message).toBe('Token tunnel mismatch')
  })

  it('returns 502 when no session exists for the tunnel', async () => {
    const publicId = 'abc123xyz'
    const config = makeConfig()
    const logger = makeLogger()
    const sessionManager = {
      getByPublicId: mock(() => undefined),
    } as unknown as SessionManager

    const { req, url } = await makeAuthenticatedRequest(publicId)

    const result = await handleTunnelTraffic(
      req,
      url,
      config,
      sessionManager,
      {} as TunnelSessionHandler,
      logger,
    )

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(502)
  })

  it('returns 503 when agent is not ready', async () => {
    const publicId = 'abc123xyz'
    const config = makeConfig()
    const logger = makeLogger()
    const session = makeTunnelSession({ publicId, agentReady: false })
    const sessionManager = {
      getByPublicId: mock(() => session),
    } as unknown as SessionManager

    const { req, url } = await makeAuthenticatedRequest(publicId)

    const result = await handleTunnelTraffic(
      req,
      url,
      config,
      sessionManager,
      {} as TunnelSessionHandler,
      logger,
    )

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(503)
  })

  it('returns ws-upgrade for WebSocket upgrade requests', async () => {
    const publicId = 'abc123xyz'
    const config = makeConfig()
    const logger = makeLogger()
    const session = makeTunnelSession({ publicId })
    const sessionManager = {
      getByPublicId: mock(() => session),
    } as unknown as SessionManager

    const { req: baseReq, url } = await makeAuthenticatedRequest(publicId)
    // Create new request with Upgrade header
    const req = new Request(baseReq.url, {
      headers: {
        'X-Tunnel-Public-Id': publicId,
        Upgrade: 'websocket',
        Connection: 'Upgrade',
      },
    })

    const result = await handleTunnelTraffic(
      req,
      url,
      config,
      sessionManager,
      {} as TunnelSessionHandler,
      logger,
    )

    expect(result).not.toBeNull()
    expect(result).not.toBeInstanceOf(Response)
    const wsResult = result as TunnelWSUpgradeRequest
    expect(wsResult.type).toBe('ws-upgrade')
    expect(wsResult.data.publicId).toBe(publicId)
    expect(wsResult.data.session).toBe(session)
  })

  it('proxies HTTP traffic through tunnel agent', async () => {
    const publicId = 'abc123xyz'
    const config = makeConfig()
    const logger = makeLogger()
    const session = makeTunnelSession({ publicId })
    const sessionManager = {
      getByPublicId: mock(() => session),
    } as unknown as SessionManager

    const proxyResponse = {
      statusCode: 200,
      headers: { 'Content-Type': 'text/html' },
      body: Buffer.from('<h1>Hello</h1>'),
    }
    const tunnelHandler = {
      proxyHTTPDirect: mock(async () => proxyResponse),
    } as unknown as TunnelSessionHandler

    const { req, url } = await makeAuthenticatedRequest(
      publicId,
      '/-/tunnel/index.html',
    )

    const result = await handleTunnelTraffic(
      req,
      url,
      config,
      sessionManager,
      tunnelHandler,
      logger,
    )

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    expect(response.status).toBe(200)
    expect(response.headers.get('Content-Type')).toBe('text/html')

    const body = await response.text()
    expect(body).toBe('<h1>Hello</h1>')

    // Verify proxyHTTPDirect was called with correct path
    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(tunnelHandler.proxyHTTPDirect).toHaveBeenCalledTimes(1)
    const callArgs = (tunnelHandler.proxyHTTPDirect as ReturnType<typeof mock>)
      .mock.calls[0]
    expect(callArgs[1]).toBe('GET') // method
    expect(callArgs[2]).toContain('/index.html') // path
  })

  it('returns 502 when proxy throws', async () => {
    const publicId = 'abc123xyz'
    const config = makeConfig()
    const logger = makeLogger()
    const session = makeTunnelSession({ publicId })
    const sessionManager = {
      getByPublicId: mock(() => session),
    } as unknown as SessionManager

    const tunnelHandler = {
      proxyHTTPDirect: mock(async () => {
        throw new Error('Connection refused')
      }),
    } as unknown as TunnelSessionHandler

    const { req, url } = await makeAuthenticatedRequest(publicId)

    const result = await handleTunnelTraffic(
      req,
      url,
      config,
      sessionManager,
      tunnelHandler,
      logger,
    )

    expect(result).toBeInstanceOf(Response)
    expect((result as Response).status).toBe(502)
    const body = (await (result as Response).json()) as { error: string }
    expect(body.error).toBe('proxy_error')
  })

  it('strips hop-by-hop headers from forwarded request', async () => {
    const publicId = 'abc123xyz'
    const config = makeConfig()
    const logger = makeLogger()
    const session = makeTunnelSession({ publicId })
    const sessionManager = {
      getByPublicId: mock(() => session),
    } as unknown as SessionManager

    let capturedHeaders: Record<string, string> = {}
    const tunnelHandler = {
      proxyHTTPDirect: mock(
        (
          _s: unknown,
          _m: string,
          _p: string,
          headers: Record<string, string>,
        ) => {
          capturedHeaders = headers
          return { statusCode: 200, headers: {}, body: null }
        },
      ),
    } as unknown as TunnelSessionHandler

    const { url } = await makeAuthenticatedRequest(publicId)
    const req = new Request(url.toString(), {
      headers: {
        'X-Tunnel-Public-Id': publicId,
        Connection: 'keep-alive',
        'Keep-Alive': 'timeout=5',
        'X-Custom': 'preserved',
        'X-Tunnel-Label': 'should-be-stripped',
      },
    })

    await handleTunnelTraffic(
      req,
      url,
      config,
      sessionManager,
      tunnelHandler,
      logger,
    )

    // Hop-by-hop and x-tunnel-* headers should be stripped
    expect(capturedHeaders['connection']).toBeUndefined()
    expect(capturedHeaders['Connection']).toBeUndefined()
    expect(capturedHeaders['keep-alive']).toBeUndefined()
    expect(capturedHeaders['Keep-Alive']).toBeUndefined()
    expect(capturedHeaders['x-tunnel-label']).toBeUndefined()
    expect(capturedHeaders['X-Tunnel-Label']).toBeUndefined()
    // Custom header should be preserved
    expect(capturedHeaders['X-Custom'] ?? capturedHeaders['x-custom']).toBe(
      'preserved',
    )
  })

  it('forwards path correctly stripping /-/tunnel prefix', async () => {
    const publicId = 'abc123xyz'
    const config = makeConfig()
    const logger = makeLogger()
    const session = makeTunnelSession({ publicId })
    const sessionManager = {
      getByPublicId: mock(() => session),
    } as unknown as SessionManager

    let capturedPath = ''
    const tunnelHandler = {
      proxyHTTPDirect: mock(async (_s: unknown, _m: string, path: string) => {
        capturedPath = path
        return { statusCode: 200, headers: {}, body: null }
      }),
    } as unknown as TunnelSessionHandler

    const { req, url } = await makeAuthenticatedRequest(
      publicId,
      '/-/tunnel/api/v1/data',
    )

    await handleTunnelTraffic(
      req,
      url,
      config,
      sessionManager,
      tunnelHandler,
      logger,
    )

    expect(capturedPath).toContain('/api/v1/data')
  })

  it('sets auth cookie on first request with query token', async () => {
    const publicId = 'abc123xyz'
    const config = makeConfig()
    const logger = makeLogger()
    const session = makeTunnelSession({ publicId })
    const sessionManager = {
      getByPublicId: mock(() => session),
    } as unknown as SessionManager
    const tunnelHandler = {
      proxyHTTPDirect: mock(() => ({
        statusCode: 200,
        headers: {},
        body: null,
      })),
    } as unknown as TunnelSessionHandler

    const { req, url } = await makeAuthenticatedRequest(publicId)

    const result = await handleTunnelTraffic(
      req,
      url,
      config,
      sessionManager,
      tunnelHandler,
      logger,
    )

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    const setCookie = response.headers.get('Set-Cookie')
    expect(setCookie).not.toBeNull()
    expect(setCookie).toContain('tunnel_auth=')
    expect(setCookie).toContain('HttpOnly')
  })

  it('does not set cookie when cookie auth succeeds despite query token present', async () => {
    const publicId = 'abc123xyz'
    const config = makeConfig()
    const logger = makeLogger()
    const session = makeTunnelSession({ publicId })
    const sessionManager = {
      getByPublicId: mock(() => session),
    } as unknown as SessionManager
    const tunnelHandler = {
      proxyHTTPDirect: mock(() => ({
        statusCode: 200,
        headers: {},
        body: null,
      })),
    } as unknown as TunnelSessionHandler

    const now = Math.floor(Date.now() / 1000)
    const token = await signJWT(
      { public_id: publicId, iat: now, exp: now + 3600 },
      'test-tunnel-jwt-secret',
    )
    // Request has BOTH a valid cookie AND a query token
    const req = new Request(`http://localhost/-/tunnel/?token=${token}`, {
      headers: {
        'X-Tunnel-Public-Id': publicId,
        Cookie: `tunnel_auth=${token}`,
      },
    })
    const url = new URL(req.url)

    const result = await handleTunnelTraffic(
      req,
      url,
      config,
      sessionManager,
      tunnelHandler,
      logger,
    )

    expect(result).toBeInstanceOf(Response)
    const response = result as Response
    // Cookie auth succeeded → no Set-Cookie needed
    const setCookie = response.headers.get('Set-Cookie')
    expect(setCookie).toBeNull()
  })

  it('forwards request body for POST requests', async () => {
    const publicId = 'abc123xyz'
    const config = makeConfig()
    const logger = makeLogger()
    const session = makeTunnelSession({ publicId })
    const sessionManager = {
      getByPublicId: mock(() => session),
    } as unknown as SessionManager

    let capturedBody: Buffer | null = null
    const tunnelHandler = {
      proxyHTTPDirect: mock(
        (
          _s: unknown,
          _m: string,
          _p: string,
          _h: Record<string, string>,
          body: Buffer | null,
        ) => {
          capturedBody = body
          return { statusCode: 201, headers: {}, body: null }
        },
      ),
    } as unknown as TunnelSessionHandler

    const now = Math.floor(Date.now() / 1000)
    const token = await signJWT(
      { public_id: publicId, iat: now, exp: now + 3600 },
      'test-tunnel-jwt-secret',
    )
    const req = new Request(
      `http://localhost/-/tunnel/api/submit?token=${token}`,
      {
        method: 'POST',
        headers: {
          'X-Tunnel-Public-Id': publicId,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ key: 'value' }),
      },
    )
    const url = new URL(req.url)

    await handleTunnelTraffic(
      req,
      url,
      config,
      sessionManager,
      tunnelHandler,
      logger,
    )

    expect(capturedBody).not.toBeNull()
    expect(JSON.parse(capturedBody!.toString())).toEqual({ key: 'value' })
  })
})
