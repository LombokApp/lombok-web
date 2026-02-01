import { Inject, Injectable } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { eq } from 'drizzle-orm'
import { JWTService } from 'src/auth/services/jwt.service'
import { coreConfig } from 'src/core/config'
import { buildPlatformOrigin } from 'src/core/utils/platform-origin.util'
import { EmailService } from 'src/email/email.service'
import { OrmService } from 'src/orm/orm.service'
import { EMAIL_PROVIDER_CONFIG } from 'src/server/constants/server.constants'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { BaseCoreTaskProcessor } from 'src/task/base.processor'
import { CoreTaskName } from 'src/task/task.constants'
import { usersTable } from 'src/users/entities/user.entity'

import { EmailNotConfiguredException } from '../exceptions/email-not-configured.exception'

@Injectable()
export class SendEmailVerificationLinkProcessor extends BaseCoreTaskProcessor<CoreTaskName.SendEmailVerificationLink> {
  constructor(
    private readonly emailService: EmailService,
    private readonly jwtService: JWTService,
    private readonly ormService: OrmService,
    private readonly serverConfigurationService: ServerConfigurationService,
    @Inject(coreConfig.KEY)
    private readonly coreConfigValues: nestjsConfig.ConfigType<
      typeof coreConfig
    >,
  ) {
    super(CoreTaskName.SendEmailVerificationLink, async (task) => {
      const platformOrigin = buildPlatformOrigin(this.coreConfigValues)
      const { userId, userEmail } = task.data
      const user = await this.ormService.db.query.usersTable.findFirst({
        where: eq(usersTable.id, userId),
      })
      if (!user?.email || !user.emailVerificationKey) {
        this.logger.warn(
          { userId },
          'User not found or no email/verification key',
        )
        return
      }
      if (user.email !== userEmail) {
        this.logger.warn({ userId }, 'Task email does not match user email')
        return
      }
      if (user.emailVerified) {
        this.logger.verbose({ userId }, 'Email already verified, skipping')
        return
      }
      let token: string
      try {
        token = this.jwtService.createEmailVerificationToken({
          userId: user.id,
          email: user.email,
          emailVerifyKey: user.emailVerificationKey,
        })
      } catch (err) {
        this.logger.warn(
          { err },
          'Could not create email verification token (keys configured?)',
        )
        return
      }
      const verificationUrl = `${platformOrigin}/verify-email?token=${encodeURIComponent(token)}`
      const emailConfig = await this.serverConfigurationService.getServerConfig(
        EMAIL_PROVIDER_CONFIG,
      )
      const from = emailConfig?.from ?? 'noreply@localhost'
      try {
        await this.emailService.sendEmail({
          to: user.email,
          from,
          subject: 'Verify your email',
          text: `Please verify your email by opening this link:\n\n${verificationUrl}\n\nThis link expires in 24 hours.`,
          html: `<!DOCTYPE html><html><body><p>Please verify your email by opening this link:</p><p><a href="${verificationUrl}">${verificationUrl}</a></p><p>This link expires in 24 hours.</p></body></html>`,
        })
      } catch (err) {
        if (err instanceof EmailNotConfiguredException) {
          this.logger.error(
            { err, userId },
            'Failed to send verification email because email provider is not configured',
          )
        }
        throw err
      }
    })
  }
}
