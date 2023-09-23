import { Lifecycle, scoped } from 'tsyringe'

import { SendgridService } from '../../../services/sendgrid.service'
import { Actor } from '../../auth/actor'
import { JWTService } from '../../auth/services/jwt.service'
import { SessionService } from '../../auth/services/session.service'
import { UserRepository } from '../entities/user.repository'
import {
  LoginInvalidError,
  UserEmailNotVerifiedError,
} from '../errors/user.error'
import { UserService } from './user.service'

export enum ApiKeyType {
  EmailVerify = 'EmailVerify',
  PasswordChange = 'PasswordChange',
}

@scoped(Lifecycle.ContainerScoped)
export class UserAuthService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly sessionService: SessionService,
    private readonly userService: UserService,
    private readonly sendgridService: SendgridService,
    private readonly jwtService: JWTService,
  ) {}

  // async signup(data: CreateUserDto) {
  //   const user = await this.userService.registerUser(data)
  //   await this.sendEmailVerification(data.email)

  //   return user
  // }

  async authenticateWithPassword(login: string, password: string) {
    const user = await this.userRepository.findOne({
      email: login,
    })

    if (!user || !user.verifyPassword(password)) {
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
      await this.sessionService.createSession(Actor.fromUser(user))

    return {
      user: session,
      accessToken,
      refreshToken,
      expiresAt: session.expiresAt,
    }
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
