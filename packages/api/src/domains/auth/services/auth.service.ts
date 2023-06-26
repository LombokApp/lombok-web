import { Lifecycle, scoped } from 'tsyringe'

import { EnvConfigProvider } from '../../../config/env-config.provider'
import type { User } from '../../user/entities/user.entity'
import { UserRepository } from '../../user/entities/user.repository'
import { UserService } from '../../user/services/user.service'
import { Actor } from '../actor'
import type { Credential } from '../credential'
import type { Session } from '../entities/session.entity'
import type { AccessTokenJWT } from './auth-token.service'
import { AuthTokenService } from './auth-token.service'
import { SessionService } from './session.service'

export interface VerifyResult<T extends Credential = Credential> {
  viewer?: Actor | null
  user?: User | null
  credential?: T | null
}

@scoped(Lifecycle.ContainerScoped)
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly userRepository: UserRepository,
    private readonly sessionService: SessionService,
    private readonly config: EnvConfigProvider,
    private readonly authTokenService: AuthTokenService,
  ) {}

  _getUser(token: AccessTokenJWT) {
    return this.userRepository.findOneOrFail({ id: token.sub })
  }

  async verifyApiKey(tokenString: string) {
    const apiKey = await this.authTokenService.verifyApiKey(tokenString)
    const user = apiKey.user

    return {
      viewer: Actor.fromUser(user as unknown as User),
      credential: apiKey,
      user: user as unknown as User,
    }
  }

  async verifyAccessToken(tokenString: string): Promise<VerifyResult> {
    const token = this.authTokenService.verifyAccessToken(tokenString)
    const user = await this._getUser(token)

    return {
      viewer: Actor.fromUser(user as unknown as User),
      credential: token,
      user: user as unknown as User,
    }
  }

  async verifySession(secret: string): Promise<VerifyResult<Session>> {
    const key = await this.sessionService.verify(secret)

    return {
      viewer: Actor.fromUser(key.user),
      user: key.user,
      credential: key,
    }
  }
}
