import { addMs, earliest } from '@stellariscloud/utils'
import { Lifecycle, scoped } from 'tsyringe'

import type { SignupParams } from '../../../controllers/auth.controller'
import { UserStatus } from '../../user/constants/user.constants'
import type { User } from '../../user/entities/user.entity'
import { UserRepository } from '../../user/entities/user.repository'
import { UserIdentityConflictError } from '../../user/errors/user.error'
import { Actor } from '../actor'
import { AuthDurationMs } from '../constants/duration.constants'
import { PlatformRole } from '../constants/role.constants'
import type { Session } from '../entities/session.entity'
import type { AccessTokenJWT } from './jwt.service'
import { JWTService } from './jwt.service'
import { SessionService } from './session.service'

/**
 * Calculates the sliding expiration of a session token based on the initial
 * creation timestamp.
 */
export const sessionExpiresAt = (createdAt: Date) =>
  earliest(
    addMs(new Date(), AuthDurationMs.SessionSliding),
    addMs(createdAt, AuthDurationMs.SessionAbsolute),
  )

@scoped(Lifecycle.ContainerScoped)
export class AuthService {
  constructor(
    private readonly jwtService: JWTService,
    private readonly sessionService: SessionService,
    private readonly userRepository: UserRepository,
  ) {}

  async signup(data: SignupParams) {
    const user = await this.createSignup(data)
    // await this.sendEmailVerification(data.email)

    return user
  }

  async createSignup(data: SignupParams) {
    const { email, password } = data

    const count = await this.userRepository.count(
      { email },
      { filters: { deleted: false } },
    )

    if (count > 0) {
      throw new UserIdentityConflictError(email)
    }

    const user = this.userRepository.create({
      email,
      emailVerified: false,
      role: PlatformRole.Authenticated,
      status: UserStatus.Pending,
    })

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (password?.length > 0) {
      user.setPassword(password)
    }

    await this.userRepository.getEntityManager().persistAndFlush(user)

    return user
  }

  _getUser(token: AccessTokenJWT) {
    return this.userRepository.findOneOrFail({ id: token.sub })
  }

  // async verifyApiKey(apiKeyString: string): Promise<{
  //   viewer: Actor
  // }> {
  //   const apiKey = await this.authTokenService.verifyApiKey(apiKeyString)
  //   const user = apiKey.user

  //   return {
  //     viewer: Actor.fromUser(user),
  //   }
  // }

  async verifyWorkerAccessToken(
    tokenString: string,
  ): Promise<{ viewer: Actor }> {
    this.jwtService.verifyWorkerAccessToken(tokenString)
    return Promise.resolve({
      viewer: {
        id: '',
        user: {} as unknown as User,
        role: PlatformRole.Service,
        authenticated: true,
      },
    })
  }

  async verifySessionWithAccessToken(
    tokenString: string,
  ): Promise<{ viewer: Actor; user: User; session: Session }> {
    const accessToken = this.jwtService.verifyAccessToken(tokenString)
    const session = await this.sessionService.verifySessionWithAccessToken(
      accessToken,
    )

    return {
      viewer: Actor.fromUser(session.user as unknown as User),
      user: session.user,
      session,
    }
  }

  async verifySessionWithRefreshToken(
    refreshToken: string,
  ): Promise<{ viewer: Actor; user: User; session: Session }> {
    const session = await this.sessionService.verifySessionWithRefreshToken(
      refreshToken,
    )

    return {
      viewer: Actor.fromUser(session.user),
      user: session.user,
      session,
    }
  }
}
