import type { ModuleConfig } from '@stellariscloud/types'
import { addMs, earliest } from '@stellariscloud/utils'
import { eq } from 'drizzle-orm'
import { container, singleton } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'

import type { SignupParams } from '../../../controllers/auth.controller'
import { OrmService } from '../../../orm/orm.service'
import { ModuleService } from '../../module/services/module.service'
import type { NewUser, User } from '../../user/entities/user.entity'
import { usersTable } from '../../user/entities/user.entity'
import { UserIdentityConflictError } from '../../user/errors/user.error'
import { AuthDurationMs } from '../constants/duration.constants'
import type { Session } from '../entities/session.entity'
import { AccessTokenInvalidError } from '../errors/access-token.error'
import { SessionInvalidError } from '../errors/session.error'
import { authHelper } from '../utils/auth-helper'
import { AccessTokenJWT, JWTService } from './jwt.service'
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

@singleton()
export class AuthService {
  constructor(
    private readonly jwtService: JWTService,
    private readonly moduleService: ModuleService,
  ) {}
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
      isAdmin: false,
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

  async verifyModuleWithToken(
    moduleId: string,
    tokenString: string,
  ): Promise<{ module?: ModuleConfig }> {
    const module: ModuleConfig | undefined = await this.moduleService.getModule(
      moduleId,
    )

    if (!module) {
      throw new AccessTokenInvalidError()
    }

    const parsed = this.jwtService.verifyModuleJWT(
      moduleId,
      module.publicKey,
      tokenString,
    )

    if (!parsed.sub?.startsWith('MODULE')) {
      throw new AccessTokenInvalidError()
    }

    return Promise.resolve({
      module,
    })
  }

  async verifySessionWithAccessToken(
    tokenString: string,
  ): Promise<{ user: User; session: Session }> {
    const accessToken = AccessTokenJWT.parse(
      this.jwtService.verifyJWT(tokenString),
    )
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
      user,
      session,
    }
  }

  async verifySessionWithRefreshToken(
    refreshToken: string,
  ): Promise<{ user: User; session: Session }> {
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
      user,
      session,
    }
  }
}
