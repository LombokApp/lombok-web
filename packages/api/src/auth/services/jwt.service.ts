import {
  Inject,
  Injectable,
  InternalServerErrorException,
  UnauthorizedException,
} from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { eq } from 'drizzle-orm'
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

import { platformConfig } from '../../platform/config'

const ALGORITHM = 'HS256'

export const USER_JWT_SUB_PREFIX = 'user:'
export const APP_USER_JWT_SUB_PREFIX = 'app_user:'
export const APP_JWT_SUB_PREFIX = 'app:'
export const APP_WORKER_JWT_SUB_PREFIX = 'app_worker:'

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
  readonly errors: z.ZodIssue[]

  constructor(
    readonly token: unknown,
    failure: z.ZodError,
  ) {
    super()
    this.failureCode = failure.name
    this.failureMessage = failure.message
    this.errors = failure.errors
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

@Injectable()
export class JWTService {
  constructor(
    @Inject(authConfig.KEY)
    private readonly _authConfig: nestjsConfig.ConfigType<typeof authConfig>,
    @Inject(platformConfig.KEY)
    private readonly _platformConfig: nestjsConfig.ConfigType<
      typeof platformConfig
    >,
    private readonly ormService: OrmService,
  ) {}

  // eslint-disable-next-line @typescript-eslint/require-await
  async createAppWorkerToken(appIdentifier: string) {
    return jwt.sign(
      {
        aud: this._platformConfig.hostId,
        jti: `${uuidV4()}`,
        scp: [],
        sub: `${APP_WORKER_JWT_SUB_PREFIX}${appIdentifier}`,
      },
      this._authConfig.authJwtSecret,
      {
        algorithm: ALGORITHM,
        expiresIn: AuthDurationSeconds.AppWorker,
      },
    )
  }

  async createSessionAccessToken(session: Session): Promise<string> {
    const payload: AccessTokenJWT = {
      aud: this._platformConfig.hostId,
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
      algorithm: ALGORITHM,
      expiresIn: AuthDurationSeconds.SessionSliding, // session validity is managed by the db row, so the token should be valid at least as long as the session
    })

    AccessTokenJWT.parse(this.verifyUserJWT(token))

    return token
  }

  async createAppUserAccessToken(
    session: Session,
    appIdentifier: string,
  ): Promise<string> {
    const payload: AccessTokenJWT = {
      aud: this._platformConfig.hostId,
      jti: `${session.id}:${uuidV4()}`,
      scp: [],
      sub: `${APP_USER_JWT_SUB_PREFIX}${session.userId}:${appIdentifier}`,
    }

    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, session.userId),
    })

    if (!user) {
      throw new InternalServerErrorException()
    }

    const token = jwt.sign(payload, this._authConfig.authJwtSecret, {
      algorithm: ALGORITHM,
      expiresIn: AuthDurationSeconds.SessionSliding,
    })

    AccessTokenJWT.parse(this.verifyUserJWT(token))

    return token
  }

  verifyUserJWT(token: string) {
    try {
      return jwt.verify(token, this._authConfig.authJwtSecret, {
        algorithms: [ALGORITHM],
        audience: this._platformConfig.hostId,
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

  verifyAppUserJWT({
    appIdentifier,
    userId,
    token,
  }: {
    appIdentifier: string
    userId: string
    token: string
  }) {
    try {
      return jwt.verify(token, this._authConfig.authJwtSecret, {
        algorithms: [ALGORITHM],
        subject: `${APP_USER_JWT_SUB_PREFIX}${userId}:${appIdentifier}`,
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

  verifyAppJWT({
    appIdentifier,
    publicKey,
    token,
  }: {
    appIdentifier: string
    publicKey: string
    token: string
  }) {
    try {
      return jwt.verify(token, publicKey, {
        algorithms: ['RS512'],
        subject: `${APP_JWT_SUB_PREFIX}${appIdentifier}`,
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
  verifyAppWorkerToken({
    appIdentifier,
    token,
  }: {
    appIdentifier: string
    token: string
  }) {
    try {
      return jwt.verify(token, this._authConfig.authJwtSecret, {
        algorithms: [ALGORITHM],
        audience: this._platformConfig.hostId,
        subject: `${APP_WORKER_JWT_SUB_PREFIX}${appIdentifier}`,
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
}
