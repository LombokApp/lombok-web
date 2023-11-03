import { eq } from 'drizzle-orm'
import type { JwtPayload } from 'jsonwebtoken'
import jwt from 'jsonwebtoken'
import * as r from 'runtypes'
import { singleton } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'

import { EnvConfigProvider } from '../../../config/env-config.provider'
import { OrmService } from '../../../orm/orm.service'
import { usersTable } from '../../user/entities/user.entity'
import { AuthDurationSeconds } from '../constants/duration.constants'
import type { Session } from '../entities/session.entity'
import {
  AuthTokenExpiredError,
  AuthTokenInvalidError,
  AuthTokenParseError,
} from '../errors/auth-token.error'
import { SessionInvalidError } from '../errors/session.error'

const ALGORITHM = 'HS256'

export const accessTokenType: r.Runtype<AccessTokenJWT> = r.Record({
  aud: r.String,
  jti: r.String,
  sub: r.String,
  scp: r.Array(r.String),
})

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

@singleton()
export class JWTService {
  constructor(
    private readonly config: EnvConfigProvider,
    private readonly ormService: OrmService,
  ) {}

  createWorkerSocketAccessToken(workerKeyId: string): string {
    const { jwtSecret } = this.config.getAuthConfig()
    const { hostId } = this.config.getApiConfig()

    const payload: AccessTokenJWT = {
      aud: hostId,
      jti: `${workerKeyId}:${uuidV4()}`,
      scp: ['socket_connect'],
      sub: `WORKER:${workerKeyId}`,
    }

    const token = jwt.sign(payload, jwtSecret, {
      algorithm: ALGORITHM,
      expiresIn: 60, // socket init tokens only need to be valid for a very short time
    })

    AccessTokenJWT.parse(this.verifyJWT(token))

    return token
  }

  createFolderSocketAccessToken(userId: string, folderId: string): string {
    const { jwtSecret } = this.config.getAuthConfig()
    const { hostId } = this.config.getApiConfig()

    const payload: AccessTokenJWT = {
      aud: hostId,
      jti: `${userId}:${uuidV4()}`,
      scp: [`socket_connect:${folderId}`],
      sub: `USER:${userId}`,
    }

    const token = jwt.sign(payload, jwtSecret, {
      algorithm: ALGORITHM,
      expiresIn: 60, // socket init tokens only need to be valid for a very short time
    })

    AccessTokenJWT.parse(this.verifyJWT(token))

    return token
  }

  async createSessionAccessToken(session: Session): Promise<string> {
    const { jwtSecret } = this.config.getAuthConfig()
    const { hostId } = this.config.getApiConfig()

    const payload: AccessTokenJWT = {
      aud: hostId,
      jti: `${session.id}:${uuidV4()}`,
      scp: [],
      sub: `USER:${session.userId}`,
    }

    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, session.userId),
    })

    if (!user) {
      throw new SessionInvalidError()
    }

    const token = jwt.sign(payload, jwtSecret, {
      algorithm: ALGORITHM,
      expiresIn: AuthDurationSeconds.AccessToken,
    })

    AccessTokenJWT.parse(this.verifyJWT(token))

    return token
  }

  createWorkerAccessToken(workerKeyId: string): string {
    const { jwtSecret } = this.config.getAuthConfig()
    const { hostId } = this.config.getApiConfig()

    const payload: AccessTokenJWT = {
      aud: hostId,
      jti: `${workerKeyId}:${uuidV4()}`,
      scp: ['perform_work'],
      sub: `WORKER:${workerKeyId}`,
    }

    const token = jwt.sign(payload, jwtSecret, {
      algorithm: ALGORITHM,
      expiresIn: AuthDurationSeconds.WorkerAccessToken,
    })

    AccessTokenJWT.parse(this.verifyJWT(token))

    return token
  }

  verifyJWT(token: string) {
    const { jwtSecret } = this.config.getAuthConfig()
    const { hostId } = this.config.getApiConfig()

    try {
      return jwt.verify(token, jwtSecret, {
        algorithms: [ALGORITHM],
        audience: hostId,
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
}
