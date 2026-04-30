import {
  APP_JWT_ISSUER,
  APP_JWT_SUB_PREFIX,
  APP_TOKEN_EXTRA_MAX_BYTES,
  APP_USER_JWT_SUB_PREFIX,
  APP_USER_WORKER_JWT_SUB_PREFIX,
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
import type {
  JsonWebTokenError,
  JwtPayload,
  TokenExpiredError,
} from 'jsonwebtoken'
import * as jwt from 'jsonwebtoken'
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
const EMAIL_VERIFY_KID = 'email-verify'
const EMAIL_VERIFY_AUD = 'email-verify'
const EMAIL_VERIFY_ISS = 'lombok-api'
const EMAIL_VERIFY_ALG_RS = 'RS256'
const EMAIL_VERIFY_ALG_HS = 'HS256'

export const USER_JWT_SUB_PREFIX = 'user:'
export {
  APP_JWT_SUB_PREFIX,
  APP_USER_JWT_SUB_PREFIX,
  APP_USER_WORKER_JWT_SUB_PREFIX,
} from '@lombokapp/types'

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
    error?: JsonWebTokenError,
  ) {
    super()
    this.inner = error?.inner
  }
}

export class AuthTokenExpiredError extends UnauthorizedException {
  name = AuthTokenExpiredError.name

  readonly inner
  readonly expiredAt

  constructor(
    readonly token: string,
    error: TokenExpiredError,
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
    const payload: AccessTokenJWT = {
      aud: this._coreConfig.platformHost,
      jti: `${session.id}:${uuidV4()}`,
      scp: [],
      sub: `${USER_JWT_SUB_PREFIX}${session.userId}`,
    }

    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, session.userId),
    })

    if (!user) {
      throw new InternalServerErrorException()
    }

    const token = jwt.sign(payload, this._authConfig.authJwtSecret, {
      algorithm: HS_ALGORITHM,
      expiresIn: AuthDurationSeconds.SessionSliding,
    })

    AccessTokenJWT.parse(this.verifyUserJWT(token))

    return token
  }

  verifyUserJWT(token: string) {
    try {
      return jwt.verify(token, this._authConfig.authJwtSecret, {
        algorithms: [HS_ALGORITHM],
        audience: this._coreConfig.platformHost,
      }) as JwtPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthTokenExpiredError(token, error)
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthTokenInvalidError(token, error)
      }
      throw error
    }
  }

  decodeJWT(token: string): jwt.Jwt {
    try {
      const decodedJWT = jwt.decode(token, {
        complete: true,
      })
      if (!decodedJWT?.payload) {
        throw new AuthTokenInvalidError(token)
      }
      return decodedJWT
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthTokenExpiredError(token, error)
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthTokenInvalidError(token, error)
      }
      throw error
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

  createAppToken(appIdentifier: string): Promise<string> {
    return this.signAppJwt(
      {
        actor: 'app',
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

  createAppUserToken(params: {
    session: Session
    appIdentifier: string
    extra?: JsonSerializableObject
  }): Promise<string> {
    assertExtraSize(params.extra)
    return this.signAppJwt(
      {
        actor: 'app_user',
        appIdentifier: params.appIdentifier,
        userId: params.session.userId,
        sessionId: params.session.id,
        ...(params.extra ? { extra: params.extra } : {}),
      },
      {
        subject: `${APP_USER_JWT_SUB_PREFIX}${params.session.userId}:${params.appIdentifier}`,
        audience: params.appIdentifier,
        jwtid: `${params.session.id}:${uuidV4()}`,
        expiresInSec: AuthDurationSeconds.AppUserActorAccessToken,
      },
    )
  }

  createAppUserWorkerToken(params: {
    session: Session
    appIdentifier: string
    platformAccess: boolean
    extra?: JsonSerializableObject
  }): Promise<string> {
    assertExtraSize(params.extra)
    return this.signAppJwt(
      {
        actor: 'app_user_worker',
        appIdentifier: params.appIdentifier,
        userId: params.session.userId,
        sessionId: params.session.id,
        platformAccess: params.platformAccess,
        ...(params.extra ? { extra: params.extra } : {}),
      },
      {
        subject: `${APP_USER_WORKER_JWT_SUB_PREFIX}${params.session.userId}:${params.appIdentifier}`,
        audience: params.appIdentifier,
        jwtid: `${params.session.id}:${uuidV4()}`,
        expiresInSec: AuthDurationSeconds.AppUserWorkerActorAccessToken,
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
      if (error instanceof jose.errors.JWTExpired) {
        throw new AuthTokenExpiredError(token, {
          expiredAt: new Date(),
        } as never)
      }
      throw new AuthTokenInvalidError(token)
    }
    const result = appJwtClaimsSchema.safeParse(payload)
    if (!result.success) {
      throw new AuthTokenInvalidError(token)
    }
    const claims = result.data
    const expectedSubject =
      claims.actor === 'app'
        ? `${APP_JWT_SUB_PREFIX}${claims.appIdentifier}`
        : claims.actor === 'app_user'
          ? `${APP_USER_JWT_SUB_PREFIX}${claims.userId}:${claims.appIdentifier}`
          : `${APP_USER_WORKER_JWT_SUB_PREFIX}${claims.userId}:${claims.appIdentifier}`
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

  createEmailVerificationToken({
    userId,
    email,
    emailVerifyKey,
  }: {
    userId: string
    email: string
    emailVerifyKey: string
  }): string {
    const isRS = this._authConfig.emailVerificationAlgorithm === 'RS'
    const signingKey = isRS
      ? this._authConfig.emailVerificationPrivateKey
      : this._authConfig.emailVerificationSecret
    if (!signingKey) {
      throw new InternalServerErrorException(
        isRS
          ? 'Email verification not configured (missing private key)'
          : 'Email verification not configured (missing secret)',
      )
    }
    const normalizedEmail = JWTService.normalizeEmail(email)
    const now = Math.floor(Date.now() / 1000)
    const payload = {
      iss: EMAIL_VERIFY_ISS,
      aud: EMAIL_VERIFY_AUD,
      sub: userId,
      jti: uuidV4(),
      iat: now,
      exp: now + AuthDurationSeconds.EmailVerification,
      evk: emailVerifyKey,
      eh: JWTService.emailHash(normalizedEmail),
    }
    const algorithm = isRS ? EMAIL_VERIFY_ALG_RS : EMAIL_VERIFY_ALG_HS
    return jwt.sign(payload, signingKey, {
      algorithm,
      ...(isRS ? { keyid: EMAIL_VERIFY_KID } : {}),
    })
  }

  verifyEmailVerificationToken(token: string): {
    sub: string
    evk: string
    eh: string
  } {
    const isRS = this._authConfig.emailVerificationAlgorithm === 'RS'
    const verifyKey = isRS
      ? this._authConfig.emailVerificationPublicKey
      : this._authConfig.emailVerificationSecret
    if (!verifyKey) {
      throw new InternalServerErrorException(
        isRS
          ? 'Email verification not configured (missing public key)'
          : 'Email verification not configured (missing secret)',
      )
    }
    const algorithms: jwt.Algorithm[] = isRS
      ? [EMAIL_VERIFY_ALG_RS]
      : [EMAIL_VERIFY_ALG_HS]
    try {
      const decoded = jwt.verify(token, verifyKey, {
        algorithms,
        audience: EMAIL_VERIFY_AUD,
        issuer: EMAIL_VERIFY_ISS,
      }) as JwtPayload & { evk?: string; eh?: string }
      if (
        typeof decoded.sub !== 'string' ||
        typeof decoded.evk !== 'string' ||
        typeof decoded.eh !== 'string'
      ) {
        throw new AuthTokenInvalidError(token)
      }
      return { sub: decoded.sub, evk: decoded.evk, eh: decoded.eh }
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthTokenExpiredError(token, error)
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthTokenInvalidError(token, error)
      }
      throw error
    }
  }
}
