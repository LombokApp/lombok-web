import { addMs, earliest } from '@stellariscloud/utils'
import { eq } from 'drizzle-orm'
import { container, Lifecycle, scoped } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'

import type { SignupParams } from '../../../controllers/auth.controller'
import { OrmService } from '../../../orm/orm.service'
import type { NewUser, User } from '../../user/entities/user.entity'
import { usersTable } from '../../user/entities/user.entity'
import { UserIdentityConflictError } from '../../user/errors/user.error'
import { Actor } from '../actor'
import { AuthDurationMs } from '../constants/duration.constants'
import { PlatformRole } from '../constants/role.constants'
import type { Session } from '../entities/session.entity'
import { AccessTokenInvalidError } from '../errors/access-token.error'
import { SessionInvalidError } from '../errors/session.error'
import { authHelper } from '../utils/auth-helper'
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
  constructor(private readonly jwtService: JWTService) {}
  ormService = container.resolve(OrmService)
  sessionService = container.resolve(SessionService)
  async signup(data: SignupParams) {
    const user = await this.createSignup(data)
    // await this.sendEmailVerification(data.email)

    return user
  }

  async createSignup(data: SignupParams) {
    const { username, email } = data

    const existingByEmail = await this.ormService.db.query.usersTable.findFirst(
      {
        where: eq(usersTable.email, email),
      },
    )

    if (email && existingByEmail) {
      throw new UserIdentityConflictError(email)
    }

    const existingByUsername =
      await this.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, email),
      })

    if (existingByUsername) {
      throw new UserIdentityConflictError(username)
    }

    const now = new Date()
    const passwordSalt = authHelper.createPasswordSalt()
    const newUser: NewUser = {
      id: uuidV4(),
      email: data.email,
      role: PlatformRole.User,
      emailVerified: false,
      username: data.username,
      passwordHash: authHelper
        .createPasswordHash(data.password, passwordSalt)
        .toString('hex'),
      passwordSalt,
      permissions: [],
      createdAt: now,
      updatedAt: now,
    }

    const [createdUser] = await this.ormService.db
      .insert(usersTable)
      .values(newUser)
      .returning()

    return createdUser
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
    const parsed = this.jwtService.verifyWorkerAccessToken(tokenString)
    if (parsed.sub !== 'SERVER') {
      throw new AccessTokenInvalidError()
    }
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
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, session.userId),
    })

    if (!user) {
      throw new SessionInvalidError()
    }

    return {
      viewer: Actor.fromUser(user),
      user,
      session,
    }
  }

  async verifySessionWithRefreshToken(
    refreshToken: string,
  ): Promise<{ viewer: Actor; user: User; session: Session }> {
    const session = await this.sessionService.verifySessionWithRefreshToken(
      refreshToken,
    )

    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, session.userId),
    })

    if (!user) {
      throw new SessionInvalidError()
    }

    return {
      viewer: Actor.fromUser(user),
      user,
      session,
    }
  }
}
