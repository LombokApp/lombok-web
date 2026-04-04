import { describe, expect, it } from 'bun:test'

import type { BridgeConfig } from '../config.js'
import { authenticateTunnel } from './tunnel-auth.js'

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

function makeRequest(cookieToken?: string): Request {
  const headers: Record<string, string> = {}
  if (cookieToken) {
    headers['Cookie'] = `tunnel_auth=${cookieToken}`
  }
  return new Request('http://localhost/-/tunnel/index.html', { headers })
}

// --- Tests ---

describe('authenticateTunnel', () => {
  const secret = 'test-tunnel-jwt-secret'
  const publicId = 'abc123xyz'

  it('authenticates a valid cookie token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await signJWT(
      { public_id: publicId, iat: now, exp: now + 3600 },
      secret,
    )
    const config = makeConfig()
    const req = makeRequest(token)

    const result = await authenticateTunnel(req, config)

    expect(result).not.toBeNull()
    expect(result!.valid).toBe(true)
    expect(result!.payload.public_id).toBe(publicId)
  })

  it('returns null for expired token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await signJWT(
      { public_id: publicId, iat: now - 7200, exp: now - 1 },
      secret,
    )
    const config = makeConfig()
    const req = makeRequest(token)

    const result = await authenticateTunnel(req, config)
    expect(result).toBeNull()
  })

  it('returns null for wrong secret', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await signJWT(
      { public_id: publicId, iat: now, exp: now + 3600 },
      'wrong-secret',
    )
    const config = makeConfig()
    const req = makeRequest(token)

    const result = await authenticateTunnel(req, config)
    expect(result).toBeNull()
  })

  it('returns null when no cookie is present', async () => {
    const config = makeConfig()
    const req = makeRequest()

    const result = await authenticateTunnel(req, config)
    expect(result).toBeNull()
  })

  it('returns null when bridgeJwtSecret is empty', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await signJWT(
      { public_id: publicId, iat: now, exp: now + 3600 },
      secret,
    )
    const config = makeConfig({ bridgeJwtSecret: '' })
    const req = makeRequest(token)

    const result = await authenticateTunnel(req, config)
    expect(result).toBeNull()
  })

  it('returns null for malformed token', async () => {
    const config = makeConfig()
    const req = makeRequest('not-a-jwt')

    const result = await authenticateTunnel(req, config)
    expect(result).toBeNull()
  })

  it('returns null for token missing public_id', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await signJWT({ iat: now, exp: now + 3600 }, secret)
    const config = makeConfig()
    const req = makeRequest(token)

    const result = await authenticateTunnel(req, config)
    expect(result).toBeNull()
  })

  // --- Query token (3rd auth source) ---

  it('authenticates via query token parameter', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await signJWT(
      { public_id: publicId, iat: now, exp: now + 3600 },
      secret,
    )
    const config = makeConfig()
    const req = makeRequest() // no cookie

    const result = await authenticateTunnel(req, config, token)

    expect(result).not.toBeNull()
    expect(result!.valid).toBe(true)
    expect(result!.payload.public_id).toBe(publicId)
  })

  it('returns null for invalid query token', async () => {
    const config = makeConfig()
    const req = makeRequest()

    const result = await authenticateTunnel(req, config, 'bad-token')
    expect(result).toBeNull()
  })

  it('returns null for expired query token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await signJWT(
      { public_id: publicId, iat: now - 7200, exp: now - 1 },
      secret,
    )
    const config = makeConfig()
    const req = makeRequest()

    const result = await authenticateTunnel(req, config, token)
    expect(result).toBeNull()
  })

  it('prefers X-Tunnel-Token header over query token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const headerToken = await signJWT(
      { public_id: 'header-tunnel', iat: now, exp: now + 3600 },
      secret,
    )
    const queryToken = await signJWT(
      { public_id: 'query-tunnel', iat: now, exp: now + 3600 },
      secret,
    )
    const config = makeConfig()
    const req = new Request('http://localhost/-/tunnel/', {
      headers: { 'X-Tunnel-Token': headerToken },
    })

    const result = await authenticateTunnel(req, config, queryToken)

    expect(result).not.toBeNull()
    expect(result!.payload.public_id).toBe('header-tunnel')
  })

  it('prefers cookie over query token', async () => {
    const now = Math.floor(Date.now() / 1000)
    const cookieToken = await signJWT(
      { public_id: 'cookie-tunnel', iat: now, exp: now + 3600 },
      secret,
    )
    const queryToken = await signJWT(
      { public_id: 'query-tunnel', iat: now, exp: now + 3600 },
      secret,
    )
    const config = makeConfig()
    const req = makeRequest(cookieToken)

    const result = await authenticateTunnel(req, config, queryToken)

    expect(result).not.toBeNull()
    expect(result!.payload.public_id).toBe('cookie-tunnel')
  })

  it('falls through to query token when header and cookie both missing', async () => {
    const now = Math.floor(Date.now() / 1000)
    const queryToken = await signJWT(
      { public_id: 'fallback-tunnel', iat: now, exp: now + 3600 },
      secret,
    )
    const config = makeConfig()
    const req = makeRequest() // no cookie, no header

    const result = await authenticateTunnel(req, config, queryToken)

    expect(result).not.toBeNull()
    expect(result!.payload.public_id).toBe('fallback-tunnel')
  })
})
