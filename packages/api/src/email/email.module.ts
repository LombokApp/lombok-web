import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from 'src/auth/auth.module'
import { authConfig } from 'src/auth/config'
import { coreConfig } from 'src/core/config'
import { ServerModule } from 'src/server/server.module'

import { EmailService } from './email.service'
import { SendEmailVerificationLinkProcessor } from './processors/send-email-verification-link.processor'

@Module({
  imports: [
    ServerModule,
    AuthModule,
    ConfigModule.forFeature(authConfig),
    ConfigModule.forFeature(coreConfig),
  ],
  providers: [EmailService, SendEmailVerificationLinkProcessor],
  exports: [EmailService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class EmailModule {}
