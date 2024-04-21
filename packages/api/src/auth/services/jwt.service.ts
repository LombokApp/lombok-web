import {
  Inject,
  Injectable,
  InternalServerErrorException,
} from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { eq } from 'drizzle-orm'
import type {
  JsonWebTokenError,
  JwtPayload,
  TokenExpiredError,
} from 'jsonwebtoken'
import * as jwt from 'jsonwebtoken'
import * as r from 'runtypes'
import { authConfig } from 'src/auth/config'
import { AuthDurationSeconds } from 'src/auth/constants/duration.constants'
import type { Session } from 'src/auth/entities/session.entity'
import { OrmService } from 'src/orm/orm.service'
import { usersTable } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

import { coreConfig } from '../../core/config'

const ALGORITHM = 'HS256'

export const accessTokenType: r.Runtype<AccessTokenJWT> = r.Record({
  aud: r.String,
  jti: r.String,
  sub: r.String,
  scp: r.Array(r.String),
})

export class AuthTokenParseError extends Error {
  name = AuthTokenParseError.name

  readonly failureCode
  readonly details

  constructor(
    readonly token: any,
    failure: r.Failure,
  ) {
    super()
    this.failureCode = failure.code
    this.details = failure.details
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
    const result = accessTokenType.validate(decoded)

    if (!result.success) {
      throw new AuthTokenParseError(decoded, result)
    }

    return new AccessTokenJWT(result.value)
  }
}

export class AuthTokenInvalidError extends Error {
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

export class AuthTokenExpiredError extends Error {
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
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
    private readonly ormService: OrmService,
  ) {}

  async createSessionAccessToken(session: Session): Promise<string> {
    const payload: AccessTokenJWT = {
      aud: this._coreConfig.hostId,
      jti: `${session.id}:${uuidV4()}`,
      scp: [],
      sub: `USER:${session.userId}`,
    }

    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, session.userId),
    })

    if (!user) {
      throw new InternalServerErrorException()
    }

    const token = jwt.sign(payload, this._authConfig.authJwtSecret, {
      algorithm: ALGORITHM,
      expiresIn: AuthDurationSeconds.AccessToken,
    })

    AccessTokenJWT.parse(this.verifyJWT(token))

    return token
  }

  verifyJWT(token: string) {
    try {
      return jwt.verify(token, this._authConfig.authJwtSecret, {
        algorithms: [ALGORITHM],
        audience: this._coreConfig.hostId,
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

  verifyModuleJWT(appIdentifier: string, publicKey: string, token: string) {
    try {
      return jwt.verify(token, publicKey, {
        algorithms: ['RS512'],
        subject: `MODULE:${appIdentifier}`,
      }) as JwtPayload
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthTokenExpiredError(token, error)
      }
      if (error instanceof jwt.JsonWebTokenError) {
        console.log('error:', error)
        throw new AuthTokenInvalidError(token, error)
      }
      throw error
    }
  }

  decodeModuleJWT(token: string) {
    try {
      return jwt.decode(token, {
        complete: true,
      })
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
