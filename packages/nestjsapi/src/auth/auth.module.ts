import { Module } from '@nestjs/common'

import { AuthController } from './auth.controller'
import { AuthService } from './services/auth.service'
import { SessionService } from './services/session.service'

@Module({
  controllers: [AuthController],
  providers: [AuthService, SessionService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthModule {}
