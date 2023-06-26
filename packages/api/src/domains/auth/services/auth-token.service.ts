import jwt from 'jsonwebtoken'
import * as r from 'runtypes'
import { singleton } from 'tsyringe'

import { EnvConfigProvider } from '../../../config/env-config.provider'
import { AuthDurationSeconds } from '../constants/duration.constants'
import { PlatformRole, PlatformRoleType } from '../constants/role.constants'
import type { AuthScope } from '../constants/scope.constants'
import { AuthScopeType } from '../constants/scope.constants'
import type { AccessToken } from '../entities/access-token.entity'
import { ApiKeyRepository } from '../entities/api-key.repository'
import type { Session } from '../entities/session.entity'
import { ApiKeyInvalidError } from '../errors/api-key.error'
import {
  AuthTokenExpiredError,
  AuthTokenInvalidError,
  AuthTokenParseError,
} from '../errors/auth-token.error'

const ALGORITHM = 'HS256'

export const accessTokenType: r.Runtype<AccessTokenJWT> = r.Record({
  aud: r.String,
  jti: r.String,
  sub: r.String,
  scp: r.Array(AuthScopeType),
  role: PlatformRoleType.optional(),
})

export class AccessTokenJWT {
  aud!: string
  jti!: string
  sub!: string
  scp!: AuthScope[]
  role?: PlatformRole

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

@singleton()
export class AuthTokenService {
  constructor(
    private readonly config: EnvConfigProvider,
    private readonly apiKeyRepository: ApiKeyRepository,
  ) {}

  createAccessTokenValueFromEntity(key: Session | AccessToken): string {
    const { jwtSecret } = this.config.getAuthConfig()

    const payload: AccessTokenJWT = {
      aud: 'access_token',
      jti: key.id,
      scp: key.scopes as AuthScope[],
      sub: key.user.id,
    }

    if (key.user.role !== PlatformRole.Authenticated) {
      payload.role = key.user.role
    }

    const token = jwt.sign(payload, jwtSecret, {
      algorithm: ALGORITHM,
      expiresIn: AuthDurationSeconds.AccessToken,
    })

    AccessTokenJWT.parse(this.verifyJWT(token))

    return token
  }

  verifyJWT(token: string) {
    const { jwtSecret } = this.config.getAuthConfig()

    let decoded: unknown
    try {
      decoded = jwt.verify(token, jwtSecret, { algorithms: [ALGORITHM] })
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new AuthTokenExpiredError(token, error)
      }
      if (error instanceof jwt.JsonWebTokenError) {
        throw new AuthTokenInvalidError(token, error)
      }
      throw error
    }

    return decoded
  }

  verifyAccessToken(token: string) {
    return AccessTokenJWT.parse(this.verifyJWT(token))
  }

  async verifyApiKey(token: string) {
    const apiKey = await this.apiKeyRepository.findOne(
      { secret: token },
      { populate: ['user'] },
    )
    if (apiKey && !apiKey.deleted) {
      return apiKey
    }
    throw new ApiKeyInvalidError()
  }
}
