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
import { PlatformRole, PlatformRoleType } from '../constants/role.constants'
import type { AuthScope } from '../constants/scope.constants'
import { AuthScopeType } from '../constants/scope.constants'
import type { Session } from '../entities/session.entity'
import {
  AuthTokenExpiredError,
  AuthTokenInvalidError,
  AuthTokenParseError,
} from '../errors/auth-token.error'
import { SessionInvalidError } from '../errors/session.error'

const ALGORITHM = 'HS256'
const RSA_ALGORITHM = 'RS512'

export const accessTokenType: r.Runtype<AccessTokenJWT> = r.Record({
  aud: r.String,
  jti: r.String,
  sub: r.String,
  scp: r.Array(AuthScopeType),
  role: PlatformRoleType.optional(),
})

export const workerAccessTokenType: r.Runtype<WorkerAccessTokenJWT> = r.Record({
  aud: r.String,
  jti: r.String,
  sub: r.String,
})

export const socketAccessTokenType: r.Runtype<SocketAccessTokenJWT> = r.Record({
  aud: r.String,
  jti: r.String,
  sub: r.String,
  folderId: r.String,
})

export class SocketAccessTokenJWT {
  aud!: string
  jti!: string
  sub!: string
  folderId!: string

  protected constructor(decoded: SocketAccessTokenJWT) {
    Object.assign(this, decoded)
  }

  static parse(decoded: unknown) {
    const result = socketAccessTokenType.validate(decoded)

    if (!result.success) {
      throw new AuthTokenParseError(decoded, result)
    }

    return new SocketAccessTokenJWT(result.value)
  }
}

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

export class WorkerAccessTokenJWT {
  aud!: string
  jti!: string
  sub!: string

  protected constructor(decoded: AccessTokenJWT) {
    Object.assign(this, decoded)
  }

  static parse(decoded: unknown) {
    const result = accessTokenType.validate(decoded)

    if (!result.success) {
      throw new AuthTokenParseError(decoded, result)
    }

    return new WorkerAccessTokenJWT(result.value)
  }
}

@singleton()
export class JWTService {
  constructor(
    private readonly config: EnvConfigProvider,
    private readonly ormService: OrmService,
  ) {}

  createFolderSocketAccessToken(userId: string, folderId: string): string {
    const { jwtSecret } = this.config.getAuthConfig()

    const payload: SocketAccessTokenJWT = {
      aud: 'socket_access_token',
      jti: `${userId}:${uuidV4()}`,
      sub: userId,
      folderId,
    }

    const token = jwt.sign(payload, jwtSecret, {
      algorithm: ALGORITHM,
      expiresIn: 60, // socket init tokens only need to be valid for a very short time
    })

    SocketAccessTokenJWT.parse(this.verifyJWT(token))

    return token
  }

  async createAccessTokenFromSession(session: Session): Promise<string> {
    const { jwtSecret } = this.config.getAuthConfig()

    const payload: AccessTokenJWT = {
      aud: 'access_token',
      jti: `${session.id}:${uuidV4()}`,
      scp: session.scopes ?? [],
      sub: session.userId,
    }

    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, session.userId),
    })

    if (!user) {
      throw new SessionInvalidError()
    }

    if (user.role !== PlatformRole.User) {
      payload.role = user.role
    }

    const token = jwt.sign(payload, jwtSecret, {
      algorithm: ALGORITHM,
      expiresIn: AuthDurationSeconds.AccessToken,
    })

    AccessTokenJWT.parse(this.verifyJWT(token))

    return token
  }

  createWorkerAccessTokenFromWorker(workerId: string): string {
    const { jwtSecret } = this.config.getAuthConfig()

    const payload: WorkerAccessTokenJWT = {
      aud: 'worker_access_token',
      jti: `${workerId}:${uuidV4()}`,
      sub: workerId,
    }

    const token = jwt.sign(payload, jwtSecret, {
      algorithm: ALGORITHM,
      expiresIn: AuthDurationSeconds.WorkerAccessToken,
    })

    WorkerAccessTokenJWT.parse(this.verifyJWT(token))

    return token
  }

  verifyJWT(token: string) {
    const { jwtSecret } = this.config.getAuthConfig()

    try {
      return jwt.verify(token, jwtSecret, {
        algorithms: [ALGORITHM],
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

  verifyWorkerJWT(token: string) {
    const { workerJwtSecret } = this.config.getAuthConfig()
    try {
      return jwt.verify(token, workerJwtSecret, {
        algorithms: [RSA_ALGORITHM],
        audience: 'worker_access_token',
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

  verifySocketAccessToken(token: string) {
    return SocketAccessTokenJWT.parse(this.verifyJWT(token))
  }

  verifyAccessToken(token: string) {
    return AccessTokenJWT.parse(this.verifyJWT(token))
  }

  verifyWorkerAccessToken(token: string) {
    return AccessTokenJWT.parse(this.verifyWorkerJWT(token))
  }
}
