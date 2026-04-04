import { describe, expect, it } from 'bun:test'

import {
  authenticate,
  authenticateSessionToken,
  extractBearerToken,
} from './auth.js'
import type { BridgeConfig } from './config.js'

function makeConfig(overrides: Partial<BridgeConfig> = {}): BridgeConfig {
  return {
    httpPort: 3100,
    wsPort: 3101,
    bridgeApiSecret: 'test-secret',
    bridgeJwtSecret: 'test-jwt-secret',
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

function makeRequest(token?: string): Request {
  const headers: Record<string, string> = {}
  if (token !== undefined) {
    headers['Authorization'] = token
  }
  return new Request('http://localhost/test', { headers })
}

describe('authenticate', () => {
  it('valid token returns true', () => {
    const config = makeConfig()
    const req = makeRequest('Bearer test-secret')
    expect(authenticate(req, config)).toBe(true)
  })

  it('missing Authorization header returns false', () => {
    const config = makeConfig()
    const req = makeRequest()
    expect(authenticate(req, config)).toBe(false)
  })

  it('malformed header without Bearer prefix returns false', () => {
    const config = makeConfig()
    const req = makeRequest('Basic test-secret')
    expect(authenticate(req, config)).toBe(false)
  })

  it('invalid token returns false', () => {
    const config = makeConfig()
    const req = makeRequest('Bearer wrong-token')
    expect(authenticate(req, config)).toBe(false)
  })

  it('empty Bearer token returns false', () => {
    const config = makeConfig()
    const req = makeRequest('Bearer ')
    expect(authenticate(req, config)).toBe(false)
  })

  it('rejects token with different length (timing-safe)', () => {
    const config = makeConfig()
    const req = makeRequest('Bearer short')
    expect(authenticate(req, config)).toBe(false)
  })

  it('rejects token with same length but wrong value', () => {
    const config = makeConfig()
    // "test-secret" is 11 chars; create a different 11-char string
    const req = makeRequest('Bearer test-secreX')
    expect(authenticate(req, config)).toBe(false)
  })
})

describe('extractBearerToken', () => {
  it('extracts token from Authorization header', () => {
    const req = new Request('http://localhost/', {
      headers: { Authorization: 'Bearer my-token' },
    })
    expect(extractBearerToken(req)).toBe('my-token')
  })

  it('returns null when no Authorization header', () => {
    const req = new Request('http://localhost/')
    expect(extractBearerToken(req)).toBeNull()
  })

  it('returns null for non-Bearer Authorization', () => {
    const req = new Request('http://localhost/', {
      headers: { Authorization: 'Basic abc123' },
    })
    expect(extractBearerToken(req)).toBeNull()
  })

  it('extracts token from query param when URL provided', () => {
    const req = new Request('http://localhost/?token=query-tok')
    const url = new URL(req.url)
    expect(extractBearerToken(req, url)).toBe('query-tok')
  })

  it('prefers header token over query param', () => {
    const req = new Request('http://localhost/?token=query-tok', {
      headers: { Authorization: 'Bearer header-tok' },
    })
    const url = new URL(req.url)
    expect(extractBearerToken(req, url)).toBe('header-tok')
  })

  it('returns null when no token and no URL', () => {
    const req = new Request('http://localhost/')
    expect(extractBearerToken(req)).toBeNull()
  })
})

// Helper: create a minimal HMAC-SHA256 JWT for testing
async function createTestJWT(
  payload: Record<string, unknown>,
  secret: string,
): Promise<string> {
  const encoder = new TextEncoder()
  const header = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url')
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url')

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
    encoder.encode(`${header}.${body}`),
  )
  const sigB64 = Buffer.from(new Uint8Array(sig)).toString('base64url')

  return `${header}.${body}.${sigB64}`
}

describe('authenticateSessionToken', () => {
  const secret = 'test-bridge-secret'
  const sessionId = 'sess_abc123'
  const userId = 'user_456'

  it('valid session JWT returns valid result', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await createTestJWT(
      {
        sub: `bridge_session:${sessionId}`,
        sid: sessionId,
        uid: userId,
        aud: 'docker-bridge',
        iat: now,
        exp: now + 1800,
      },
      secret,
    )
    const result = await authenticateSessionToken(token, sessionId, secret)
    expect(result.valid).toBe(true)
    if (result.valid) {
      expect(result.userId).toBe(userId)
      expect(result.sessionId).toBe(sessionId)
    }
  })

  it('expired JWT returns invalid', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await createTestJWT(
      {
        sub: `bridge_session:${sessionId}`,
        sid: sessionId,
        uid: userId,
        aud: 'docker-bridge',
        iat: now - 3600,
        exp: now - 1,
      },
      secret,
    )
    const result = await authenticateSessionToken(token, sessionId, secret)
    expect(result.valid).toBe(false)
  })

  it('wrong session ID returns invalid', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await createTestJWT(
      {
        sub: `bridge_session:${sessionId}`,
        sid: sessionId,
        uid: userId,
        aud: 'docker-bridge',
        iat: now,
        exp: now + 1800,
      },
      secret,
    )
    const result = await authenticateSessionToken(token, 'sess_wrong', secret)
    expect(result.valid).toBe(false)
  })

  it('wrong audience returns invalid', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await createTestJWT(
      {
        sub: `bridge_session:${sessionId}`,
        sid: sessionId,
        uid: userId,
        aud: 'wrong-audience',
        iat: now,
        exp: now + 1800,
      },
      secret,
    )
    const result = await authenticateSessionToken(token, sessionId, secret)
    expect(result.valid).toBe(false)
  })

  it('wrong secret returns invalid', async () => {
    const now = Math.floor(Date.now() / 1000)
    const token = await createTestJWT(
      {
        sub: `bridge_session:${sessionId}`,
        sid: sessionId,
        uid: userId,
        aud: 'docker-bridge',
        iat: now,
        exp: now + 1800,
      },
      'different-secret',
    )
    const result = await authenticateSessionToken(token, sessionId, secret)
    expect(result.valid).toBe(false)
  })

  it('malformed token returns invalid', async () => {
    const result = await authenticateSessionToken(
      'not-a-jwt',
      sessionId,
      secret,
    )
    expect(result.valid).toBe(false)
  })
})
