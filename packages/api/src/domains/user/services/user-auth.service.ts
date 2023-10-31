import crypto from 'crypto'
import { eq, or } from 'drizzle-orm'
import { Lifecycle, scoped } from 'tsyringe'

import { OrmService } from '../../../orm/orm.service'
import { SessionService } from '../../auth/services/session.service'
import { authHelper } from '../../auth/utils/auth-helper'
import type { User } from '../entities/user.entity'
import { usersTable } from '../entities/user.entity'
import {
  LoginInvalidError,
  UserEmailNotVerifiedError,
} from '../errors/user.error'

export enum ApiKeyType {
  EmailVerify = 'EmailVerify',
  PasswordChange = 'PasswordChange',
}

@scoped(Lifecycle.ContainerScoped)
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
      throw new LoginInvalidError(login)
    }

    if (!user.emailVerified) {
      throw new UserEmailNotVerifiedError()
    }

    // if (user.totpEnabled()) {
    //   // TODO: Check 2FA
    // }

    // const scopes = ALLOWED_SCOPES[PlatformRole.Authenticated]

    const { session, accessToken, refreshToken } =
      await this.sessionService.createSession(user)

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

  // async sendEmailVerification(login: string) {
  //   // TODO: Send this on a queue

  //   const user = await this.userRepository.findOneOrFail({
  //     email: login,
  //   })

  //   if (user.emailVerified) {
  //     return
  //   }

  //   const { secretKey } = await this.apiKeyService.create(user, {
  //     type: ApiKeyType.EmailVerify,
  //     expiresAt: addMs(new Date(), AuthDurationMs.EmailVerification),
  //   })

  //   await this.sendgridService.sendEmail({
  //     toEmail: user.email,
  //     fromEmail: '',
  //     textContent: '',
  //     subject: 'Verify your StellarisCloud account',
  //   })
  // }

  // async sendPasswordChange(login: string) {
  //   // TODO: Send this on a queue

  //   const user = await this.userRepository.findOneOrFail({
  //     email: login,
  //   })

  //   const { secretKey } = await this.apiKeyService.create(user, {
  //     type: ApiKeyType.PASSWORD_CHANGE,
  //     expiresAt: addMs(new Date(), AuthDurationMs.PasswordChange),
  //   })

  //   await this.sendgridService.sendEmail({
  //     to: user.email,
  //     templateId: EmailTemplate.RESET_PASSWORD_INIT,
  //     dynamicTemplateData: {
  //       CODE: secretKey,
  //     },
  //   })
  // }

  // async logout(accessToken: AccessToken) {
  //   if (accessToken instanceof AccessToken) {
  //     key = accessToken
  //   }

  //   await this.userService.deleteAccessToken(accessToken)
  // }

  // async verify(key: ApiKey) {
  //   // r.Literal(ApiKeyType.EMAIL_VERIFICATION).check(key.type)

  //   const user = await key.owner.load()

  //   if (!user.emailVerified) {
  //     user.update({ emailVerified: true })

  //     await this.userRepository.getEntityManager().persistAndFlush(user)
  //   }
  // }

  // async changePassword(key: ApiKey, password: string) {
  //   r.Literal(ApiKeyType.PASSWORD_CHANGE).check(key.type)

  //   const user = await key.owner.load()

  //   user.setPassword(password)

  //   key.deletedAt = new Date()

  //   await this.userRepository.persistAndFlush(user)
  // }
}
