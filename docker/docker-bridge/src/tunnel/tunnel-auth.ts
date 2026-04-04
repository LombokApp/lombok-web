/**
 * JWT authentication for tunnel traffic.
 *
 * The bridge only validates the tunnel_auth cookie — it never mints
 * tokens or sets cookies. All token management is handled by the
 * platform API (TunnelAuthController).
 */

import type { BridgeConfig } from '../config.js'

export interface TunnelTokenPayload {
  public_id: string
  iat: number
  exp: number
}

export interface TunnelAuthResult {
  valid: true
  payload: TunnelTokenPayload
}

const COOKIE_NAME = 'tunnel_auth'

function extractCookie(req: Request, name: string): string | null {
  const cookieHeader = req.headers.get('Cookie')
  if (!cookieHeader) {
    return null
  }
  for (const part of cookieHeader.split(';')) {
    const [key, ...valueParts] = part.trim().split('=')
    if (key === name) {
      return valueParts.join('=')
    }
  }
  return null
}

async function validateTunnelJWT(
  token: string,
  secret: string,
): Promise<TunnelAuthResult | null> {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) {
      return null
    }

    const [headerB64, payloadB64, signatureB64] = parts

    const encoder = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify'],
    )

    const sigBuf = Buffer.from(signatureB64, 'base64url')
    const sigBytes = sigBuf.buffer.slice(
      sigBuf.byteOffset,
      sigBuf.byteOffset + sigBuf.byteLength,
    )
    const valid = await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(`${headerB64}.${payloadB64}`),
    )
    if (!valid) {
      return null
    }

    const payload = JSON.parse(
      Buffer.from(payloadB64, 'base64url').toString(),
    ) as TunnelTokenPayload

    const now = Math.floor(Date.now() / 1000)
    if (payload.exp <= now) {
      return null
    }
    if (!payload.public_id) {
      return null
    }

    return {
      valid: true,
      payload,
    }
  } catch {
    return null
  }
}

/**
 * Authenticate a tunnel request by validating the tunnel_auth cookie JWT.
 */
export async function authenticateTunnel(
  req: Request,
  config: BridgeConfig,
  queryToken?: string | null,
): Promise<TunnelAuthResult | null> {
  if (!config.bridgeJwtSecret) {
    return null
  }

  // 1. X-Tunnel-Token header
  const headerToken = req.headers.get('X-Tunnel-Token')
  if (headerToken) {
    const result = await validateTunnelJWT(headerToken, config.bridgeJwtSecret)
    if (result) {
      return result
    }
  }

  // 2. Cookie
  const cookieToken = extractCookie(req, COOKIE_NAME)
  if (cookieToken) {
    const result = await validateTunnelJWT(cookieToken, config.bridgeJwtSecret)
    if (result) {
      return result
    }
  }

  // 3. Query parameter token (e.g. ?token=jwt for shared links)
  if (queryToken) {
    const result = await validateTunnelJWT(queryToken, config.bridgeJwtSecret)
    if (result) {
      return result
    }
  }

  return null
}
