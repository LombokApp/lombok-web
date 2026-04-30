import {
  APP_JWT_ISSUER,
  APP_JWT_SUB_PREFIX,
  APP_USER_JWT_SUB_PREFIX,
  APP_USER_WORKER_JWT_SUB_PREFIX,
  type AppJwtClaims,
  appJwtClaimsSchema,
} from '@lombokapp/types'
import * as jose from 'jose'

const ED_ALGORITHM = 'EdDSA'

export class AppTokenVerificationError extends Error {
  constructor(
    message: string,
    readonly cause?: unknown,
  ) {
    super(message)
    this.name = 'AppTokenVerificationError'
  }
}

export interface VerifyAppTokenOptions {
  publicKeyPem: string
}

export async function verifyAppToken(
  token: string,
  options: VerifyAppTokenOptions,
): Promise<AppJwtClaims> {
  const publicKey = await jose.importSPKI(options.publicKeyPem, ED_ALGORITHM)
  let payload: jose.JWTPayload
  try {
    const verified = await jose.jwtVerify(token, publicKey, {
      algorithms: [ED_ALGORITHM],
      issuer: APP_JWT_ISSUER,
    })
    payload = verified.payload
  } catch (error) {
    throw new AppTokenVerificationError(
      error instanceof Error ? error.message : 'Token verification failed',
      error,
    )
  }
  const result = appJwtClaimsSchema.safeParse(payload)
  if (!result.success) {
    throw new AppTokenVerificationError(
      `Token claims do not match expected shape: ${result.error.message}`,
    )
  }
  const claims = result.data
  const expectedSubject =
    claims.actor === 'app'
      ? `${APP_JWT_SUB_PREFIX}${claims.appIdentifier}`
      : claims.actor === 'app_user'
        ? `${APP_USER_JWT_SUB_PREFIX}${claims.userId}:${claims.appIdentifier}`
        : `${APP_USER_WORKER_JWT_SUB_PREFIX}${claims.userId}:${claims.appIdentifier}`
  if (claims.sub !== expectedSubject) {
    throw new AppTokenVerificationError('Token subject mismatch')
  }
  if (claims.aud !== claims.appIdentifier) {
    throw new AppTokenVerificationError('Token audience mismatch')
  }
  return claims
}
