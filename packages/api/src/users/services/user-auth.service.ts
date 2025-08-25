import { Injectable } from '@nestjs/common'
import crypto from 'crypto'
import { eq, or } from 'drizzle-orm'
import { LoginInvalidException } from 'src/auth/exceptions/login-invalid.exception'
import { SessionService } from 'src/auth/services/session.service'
import { authHelper } from 'src/auth/utils/auth-helper'
import { OrmService } from 'src/orm/orm.service'

import type { User } from '../entities/user.entity'
import { usersTable } from '../entities/user.entity'
import { UserEmailNotVerifiedException } from '../exceptions/user-email-not-verified.exception'

export enum ApiKeyType {
  EmailVerify = 'EmailVerify',
  PasswordChange = 'PasswordChange',
}

@Injectable()
export class UserAuthService {
  constructor(
    private readonly sessionService: SessionService,
    private readonly ormService: OrmService,
  ) {}

  async authenticateWithPassword(login: string, password: string) {
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: or(eq(usersTable.email, login), eq(usersTable.username, login)),
    })

    if (!user || !this.verifyPassword(user, password)) {
      throw new LoginInvalidException()
    }

    if (!user.emailVerified) {
      throw new UserEmailNotVerifiedException()
    }

    const { session, accessToken, refreshToken } =
      await this.sessionService.createUserSession(user)

    return {
      user: session,
      accessToken,
      refreshToken,
      expiresAt: session.expiresAt,
    }
  }

  verifyPassword(user: User, password: string) {
    if (!user.passwordHash || !password) {
      return false
    }

    return crypto.timingSafeEqual(
      authHelper.createPasswordHash(password, user.passwordSalt),
      Buffer.from(user.passwordHash, 'hex'),
    )
  }
}
