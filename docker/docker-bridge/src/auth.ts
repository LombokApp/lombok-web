import { timingSafeEqual } from 'node:crypto'

import type { BridgeConfig } from './config.js'

/** Constant-time string comparison to prevent timing attacks. */
function timingSafeEqualStrings(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }
  const bufA = Buffer.from(a)
  const bufB = Buffer.from(b)
  return timingSafeEqual(bufA, bufB)
}

export function authenticate(req: Request, config: BridgeConfig): boolean {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader?.startsWith('Bearer ')) {
    return false
  }

  const token = authHeader.slice(7)
  if (!token) {
    return false
  }

  return timingSafeEqualStrings(token, config.bridgeApiSecret)
}

/**
 * Extract a Bearer token from an Authorization header or query param.
 */
export function extractBearerToken(req: Request, url?: URL): string | null {
  const authHeader = req.headers.get('Authorization')
  if (authHeader?.startsWith('Bearer ')) {
    const token = authHeader.slice(7)
    if (token) {
      return token
    }
  }
  if (url) {
    const queryToken = url.searchParams.get('token')
    if (queryToken) {
      return queryToken
    }
  }
  return null
}

interface SessionTokenPayload {
  sub: string
  sid: string
  uid: string
  aud: string
  iat: number
  exp: number
}

interface SessionTokenResult {
  valid: true
  userId: string
  sessionId: string
}

/**
 * Authenticate a session-scoped JWT for direct client access.
 * The JWT is signed with the bridge api secret (HMAC-SHA256).
 * Validates: signature, expiry, audience, and session ID match.
 */
export async function authenticateSessionToken(
  token: string,
  expectedSessionId: string,
  secret: string,
): Promise<SessionTokenResult | { valid: false }> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return { valid: false }
    }

    const [headerB64, payloadB64, signatureB64] = parts

    // Verify HMAC-SHA256 signature (constant-time via crypto.subtle.verify)
    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const signatureInput = `${headerB64}.${payloadB64}`
    const sigBuf = Buffer.from(signatureB64, 'base64url')
    const sigBytes = sigBuf.buffer.slice(
      sigBuf.byteOffset,
      sigBuf.byteOffset + sigBuf.byteLength,
    )
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(signatureInput),
    )
    if (!valid) {
      return { valid: false }
    }

    // Decode and validate payload
    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString(),
    ) as SessionTokenPayload

    // Check expiry
    const now = Math.floor(Date.now() / 1000)
    if (payload.exp <= now) {
      return { valid: false }
    }

    // Check audience
    if (payload.aud !== 'docker-bridge') {
      return { valid: false }
    }

    // Check session ID matches
    if (payload.sid !== expectedSessionId) {
      return { valid: false }
    }

    return {
      valid: true,
      userId: payload.uid,
      sessionId: payload.sid,
    }
  } catch {
    return { valid: false }
  }
}
