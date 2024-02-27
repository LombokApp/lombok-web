import { Module } from '@nestjs/common'

import { AuthController } from './auth.controller'
import { AuthService } from './auth.service'

@Module({
  controllers: [AuthController],
  providers: [AuthService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AuthModule {}
