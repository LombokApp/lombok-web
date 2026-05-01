import {
  APP_JWT_ISSUER,
  APP_JWT_SUB_PREFIX,
  APP_TOKEN_EXTRA_MAX_BYTES,
  APP_USER_JWT_SUB_PREFIX,
  type AppJwtClaims,
  appJwtClaimsSchema,
  type JsonSerializableObject,
} from '@lombokapp/types'
import {
  BadRequestException,
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import * as jose from 'jose'
import { authConfig } from 'src/auth/config'
import { AuthDurationSeconds } from 'src/auth/constants/duration.constants'
import type { Session } from 'src/auth/entities/session.entity'
import { OrmService } from 'src/orm/orm.service'
import { usersTable } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'
import { z } from 'zod'

import { coreConfig } from '../../core/config'
import { KeyDerivationService } from './key-derivation.service'

const HS_ALGORITHM = 'HS256'
const ED_ALGORITHM_JOSE = 'EdDSA'
const RS_ALGORITHM = 'RS256'
const EMAIL_VERIFY_KID = 'email-verify'
const EMAIL_VERIFY_AUD = 'email-verify'
const EMAIL_VERIFY_ISS = 'lombok-api'

export const USER_JWT_SUB_PREFIX = 'user:'
export { APP_JWT_SUB_PREFIX, APP_USER_JWT_SUB_PREFIX } from '@lombokapp/types'

export const accessTokenType = z.object({
  aud: z.string(),
  jti: z.string(),
  sub: z.string(),
  scp: z.array(z.string()),
})

export class AuthTokenParseError extends Error {
  name = AuthTokenParseError.name

  readonly failureMessage: string
  readonly failureCode: string
  readonly errors: z.core.$ZodIssue[]

  constructor(
    readonly token: unknown,
    failure: z.ZodError,
  ) {
    super()
    this.failureCode = failure.name
    this.failureMessage = failure.message
    this.errors = failure.issues
  }
}

export class AccessTokenJWT {
  aud!: string
  jti!: string
  sub!: string
  scp!: string[]

  protected constructor(decoded: AccessTokenJWT) {
    Object.assign(this, decoded)
  }

  static parse(decoded: unknown) {
    const result = accessTokenType.safeParse(decoded)

    if (!result.success) {
      throw new AuthTokenParseError(decoded, result.error)
    }

    return new AccessTokenJWT(result.data)
  }
}

export class AuthTokenInvalidError extends UnauthorizedException {
  name = AuthTokenInvalidError.name

  readonly inner

  constructor(
    readonly token: string,
    error?: unknown,
  ) {
    super()
    this.inner = error
  }
}

export class AuthTokenExpiredError extends UnauthorizedException {
  name = AuthTokenExpiredError.name

  readonly inner
  readonly expiredAt

  constructor(
    readonly token: string,
    error: { expiredAt: Date; inner?: unknown },
  ) {
    super()
    this.inner = error.inner
    this.expiredAt = error.expiredAt
  }
}

function assertExtraSize(extra: JsonSerializableObject | undefined): void {
  if (!extra) {
    return
  }
  const size = Buffer.byteLength(JSON.stringify(extra), 'utf8')
  if (size > APP_TOKEN_EXTRA_MAX_BYTES) {
    throw new BadRequestException(
      `App token "extra" payload exceeds ${APP_TOKEN_EXTRA_MAX_BYTES} bytes (got ${size})`,
    )
  }
}

function mapJoseError(token: string, error: unknown): never {
  if (error instanceof jose.errors.JWTExpired) {
    throw new AuthTokenExpiredError(token, {
      expiredAt: new Date(),
      inner: error,
    })
  }
  throw new AuthTokenInvalidError(token, error)
}

@Injectable()
export class JWTService {
  constructor(
    @Inject(authConfig.KEY)
    private readonly _authConfig: nestjsConfig.ConfigType<typeof authConfig>,
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
    private readonly ormService: OrmService,
    private readonly keyDerivationService: KeyDerivationService,
  ) {}

  async createSessionAccessToken(session: Session): Promise<string> {
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, session.userId),
    })

    if (!user) {
      throw new InternalServerErrorException()
    }

    const token = await new jose.SignJWT({ scp: [] })
      .setProtectedHeader({ alg: HS_ALGORITHM })
      .setAudience(this._coreConfig.platformHost)
      .setSubject(`${USER_JWT_SUB_PREFIX}${session.userId}`)
      .setJti(`${session.id}:${uuidV4()}`)
      .setIssuedAt()
      .setExpirationTime(`${AuthDurationSeconds.SessionSliding}s`)
      .sign(this.keyDerivationService.getHsSecretBytes())

    AccessTokenJWT.parse(await this.verifyUserJWT(token))

    return token
  }

  async verifyUserJWT(token: string): Promise<jose.JWTPayload> {
    try {
      const { payload } = await jose.jwtVerify(
        token,
        this.keyDerivationService.getHsSecretBytes(),
        {
          algorithms: [HS_ALGORITHM],
          audience: this._coreConfig.platformHost,
        },
      )
      return payload
    } catch (error) {
      mapJoseError(token, error)
    }
  }

  /**
   * Decode a JWT's payload without verifying its signature.
   * Used by the auth guard to route by subject prefix before delegating to
   * the right verifier.
   */
  decodeJwtPayload(token: string): jose.JWTPayload {
    try {
      return jose.decodeJwt(token)
    } catch (error) {
      throw new AuthTokenInvalidError(token, error)
    }
  }

  // ---- App-namespace tokens (Ed25519 via jose) ----

  private signAppJwt(
    claims: Record<string, unknown>,
    options: {
      subject: string
      audience: string
      jwtid: string
      expiresInSec: number
    },
  ): Promise<string> {
    return new jose.SignJWT(claims)
      .setProtectedHeader({ alg: ED_ALGORITHM_JOSE })
      .setIssuer(APP_JWT_ISSUER)
      .setAudience(options.audience)
      .setSubject(options.subject)
      .setJti(options.jwtid)
      .setIssuedAt()
      .setExpirationTime(`${options.expiresInSec}s`)
      .sign(this.keyDerivationService.getJoseSignKey())
  }

  mintAppToken(appIdentifier: string): Promise<string> {
    return this.signAppJwt(
      {
        actorType: 'app',
        appIdentifier,
      },
      {
        subject: `${APP_JWT_SUB_PREFIX}${appIdentifier}`,
        audience: appIdentifier,
        jwtid: uuidV4(),
        expiresInSec: AuthDurationSeconds.AppActorAccessToken,
      },
    )
  }

  /**
   * Resolve the `platformAccess` claim default. Tokens without a `worker`
   * context default to allowing platform access; worker-context tokens
   * default to denying it. Both can be overridden explicitly.
   */
  static resolvePlatformAccess(params: {
    worker?: string
    platformAccess?: boolean
  }): boolean {
    if (typeof params.platformAccess === 'boolean') {
      return params.platformAccess
    }
    return params.worker === undefined
  }

  createAppUserToken(params: {
    session: Session
    appIdentifier: string
    worker?: string
    platformAccess?: boolean
    extra?: JsonSerializableObject
    accessTokenExpiresInSec?: number
  }): Promise<string> {
    assertExtraSize(params.extra)
    const platformAccess = JWTService.resolvePlatformAccess(params)
    return this.signAppJwt(
      {
        actorType: 'app_user',
        appIdentifier: params.appIdentifier,
        userId: params.session.userId,
        sessionId: params.session.id,
        platformAccess,
        ...(params.worker !== undefined ? { worker: params.worker } : {}),
        ...(params.extra ? { extra: params.extra } : {}),
      },
      {
        subject: `${APP_USER_JWT_SUB_PREFIX}${params.session.userId}:${params.appIdentifier}`,
        audience: params.appIdentifier,
        jwtid: `${params.session.id}:${uuidV4()}`,
        expiresInSec:
          params.accessTokenExpiresInSec ??
          AuthDurationSeconds.AppUserActorAccessToken,
      },
    )
  }

  async verifyAppToken(token: string): Promise<AppJwtClaims> {
    let payload: jose.JWTPayload
    try {
      const verified = await jose.jwtVerify(
        token,
        this.keyDerivationService.getJoseVerifyKey(),
        {
          algorithms: [ED_ALGORITHM_JOSE],
          issuer: APP_JWT_ISSUER,
        },
      )
      payload = verified.payload
    } catch (error) {
      mapJoseError(token, error)
    }
    const result = appJwtClaimsSchema.safeParse(payload)
    if (!result.success) {
      throw new AuthTokenInvalidError(token)
    }
    const claims = result.data
    const expectedSubject =
      claims.actorType === 'app'
        ? `${APP_JWT_SUB_PREFIX}${claims.appIdentifier}`
        : `${APP_USER_JWT_SUB_PREFIX}${claims.userId}:${claims.appIdentifier}`
    if (claims.sub !== expectedSubject) {
      throw new AuthTokenInvalidError(token)
    }
    if (claims.aud !== claims.appIdentifier) {
      throw new AuthTokenInvalidError(token)
    }
    return claims
  }

  /**
   * Normalize email for consistent hashing (trim + lowercase).
   */
  static normalizeEmail(email: string): string {
    return email.trim().toLowerCase()
  }

  /**
   * eh claim: base64url(SHA-256(normalized_email)).
   */
  static emailHash(normalizedEmail: string): string {
    return crypto
      .createHash('sha256')
      .update(normalizedEmail, 'utf8')
      .digest('base64url')
  }

  private async getEmailVerificationSignKey(): Promise<{
    key: Awaited<ReturnType<typeof jose.importPKCS8>> | Uint8Array
    alg: 'RS256' | 'HS256'
  }> {
    const isRS = this._authConfig.emailVerificationAlgorithm === 'RS'
    if (isRS) {
      const pem = this._authConfig.emailVerificationPrivateKey
      if (!pem) {
        throw new InternalServerErrorException(
          'Email verification not configured (missing private key)',
        )
      }
      return {
        key: await jose.importPKCS8(pem, RS_ALGORITHM),
        alg: RS_ALGORITHM,
      }
    }
    const secret = this._authConfig.emailVerificationSecret
    if (!secret) {
      throw new InternalServerErrorException(
        'Email verification not configured (missing secret)',
      )
    }
    return { key: new TextEncoder().encode(secret), alg: HS_ALGORITHM }
  }

  private async getEmailVerificationVerifyKey(): Promise<{
    key: Awaited<ReturnType<typeof jose.importSPKI>> | Uint8Array
    alg: 'RS256' | 'HS256'
  }> {
    const isRS = this._authConfig.emailVerificationAlgorithm === 'RS'
    if (isRS) {
      const pem = this._authConfig.emailVerificationPublicKey
      if (!pem) {
        throw new InternalServerErrorException(
          'Email verification not configured (missing public key)',
        )
      }
      return {
        key: await jose.importSPKI(pem, RS_ALGORITHM),
        alg: RS_ALGORITHM,
      }
    }
    const secret = this._authConfig.emailVerificationSecret
    if (!secret) {
      throw new InternalServerErrorException(
        'Email verification not configured (missing secret)',
      )
    }
    return { key: new TextEncoder().encode(secret), alg: HS_ALGORITHM }
  }

  async createEmailVerificationToken({
    userId,
    email,
    emailVerifyKey,
  }: {
    userId: string
    email: string
    emailVerifyKey: string
  }): Promise<string> {
    const { key, alg } = await this.getEmailVerificationSignKey()
    const normalizedEmail = JWTService.normalizeEmail(email)
    const builder = new jose.SignJWT({
      evk: emailVerifyKey,
      eh: JWTService.emailHash(normalizedEmail),
    })
      .setProtectedHeader({
        alg,
        ...(alg === RS_ALGORITHM ? { kid: EMAIL_VERIFY_KID } : {}),
      })
      .setIssuer(EMAIL_VERIFY_ISS)
      .setAudience(EMAIL_VERIFY_AUD)
      .setSubject(userId)
      .setJti(uuidV4())
      .setIssuedAt()
      .setExpirationTime(`${AuthDurationSeconds.EmailVerification}s`)
    return builder.sign(key)
  }

  async verifyEmailVerificationToken(token: string): Promise<{
    sub: string
    evk: string
    eh: string
  }> {
    const { key, alg } = await this.getEmailVerificationVerifyKey()
    let payload: jose.JWTPayload & { evk?: unknown; eh?: unknown }
    try {
      const result = await jose.jwtVerify(token, key, {
        algorithms: [alg],
        audience: EMAIL_VERIFY_AUD,
        issuer: EMAIL_VERIFY_ISS,
      })
      payload = result.payload as typeof payload
    } catch (error) {
      mapJoseError(token, error)
    }
    if (
      typeof payload.sub !== 'string' ||
      typeof payload.evk !== 'string' ||
      typeof payload.eh !== 'string'
    ) {
      throw new AuthTokenInvalidError(token)
    }
    return { sub: payload.sub, evk: payload.evk, eh: payload.eh }
  }
}
