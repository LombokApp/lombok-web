import { ConflictException, Injectable } from '@nestjs/common'
import type { ModuleConfig } from '@stellariscloud/types'
import { addMs, earliest } from '@stellariscloud/utils'
import { eq, or } from 'drizzle-orm'
import { AppService } from 'src/app/services/app.service'
import { AccessTokenJWT, JWTService } from 'src/auth/services/jwt.service'
import { OrmService } from 'src/orm/orm.service'
import type { NewUser, User } from 'src/users/entities/user.entity'
import { usersTable } from 'src/users/entities/user.entity'
import { UserEmailNotVerifiedException } from 'src/users/exceptions/user-email-not-verified.exception'
import { v4 as uuidV4 } from 'uuid'

import { AuthDurationMs } from '../constants/duration.constants'
import type { LoginCredentialsDTO } from '../dto/login-credentials.dto'
import type { SignupCredentialsDTO } from '../dto/signup-credentials.dto'
import type { Session } from '../entities/session.entity'
import { AccessTokenInvalidException } from '../exceptions/auth-token-invalid.exception'
import { LoginInvalidException } from '../exceptions/login-invalid.exception'
import { SessionInvalidException } from '../exceptions/session-invalid.exception'
import { authHelper } from '../utils/auth-helper'
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

@Injectable()
export class AuthService {
  constructor(
    private readonly jwtService: JWTService,
    private readonly appService: AppService,
    private readonly ormService: OrmService,
    private readonly sessionService: SessionService,
  ) {}

  async signup(data: SignupCredentialsDTO) {
    const user = await this.createSignup(data)
    // await this.sendEmailVerification(data.email)

    return user
  }

  async createSignup(data: SignupCredentialsDTO) {
    const { username, email } = data

    const existingByEmail = await this.ormService.db.query.usersTable.findFirst(
      {
        where: eq(usersTable.email, email),
      },
    )

    if (email && existingByEmail) {
      throw new ConflictException(`User already exists with email "${email}".`)
    }

    const existingByUsername =
      await this.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.username, email),
      })

    if (existingByUsername) {
      throw new ConflictException(
        `User already exists with username "${username}".`,
      )
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

  async login({ login, password }: LoginCredentialsDTO) {
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: or(eq(usersTable.email, login), eq(usersTable.username, login)),
    })

    if (!user || !this.verifyPassword(user, password)) {
      throw new LoginInvalidException(login)
    }

    if (!user.emailVerified) {
      throw new UserEmailNotVerifiedException()
    }

    // if (user.totpEnabled()) {
    //   // TODO: Check 2FA
    // }

    const { session, accessToken, refreshToken } =
      await this.sessionService.createSession(user)

    return {
      user: session.user,
      accessToken,
      refreshToken,
      expiresAt: session.expiresAt,
    }
  }

  verifyPassword(user: User, password: string) {
    if (!user.passwordHash || !password) {
      return false
    }

    return authHelper
      .createPasswordHash(password, user.passwordSalt)
      .compare(Buffer.from(user.passwordHash, 'hex'))
  }

  async verifyModuleWithToken(
    moduleId: string,
    tokenString: string,
  ): Promise<{ module?: ModuleConfig }> {
    const module: ModuleConfig | undefined =
      await this.appService.getModule(moduleId)

    if (!module) {
      throw new AccessTokenInvalidException()
    }

    const parsed = this.jwtService.verifyModuleJWT(
      moduleId,
      module.publicKey,
      tokenString,
    )

    if (!parsed.sub?.startsWith('MODULE')) {
      throw new AccessTokenInvalidException()
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
    const session =
      await this.sessionService.verifySessionWithAccessToken(accessToken)
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, session.userId),
    })

    if (!user) {
      throw new SessionInvalidException()
    }

    return {
      user,
      session,
    }
  }

  async verifySessionWithRefreshToken(
    refreshToken: string,
  ): Promise<{ user: User; session: Session }> {
    const session =
      await this.sessionService.verifySessionWithRefreshToken(refreshToken)

    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, session.userId),
    })

    if (!user) {
      throw new SessionInvalidException()
    }

    return {
      user,
      session,
    }
  }
}
