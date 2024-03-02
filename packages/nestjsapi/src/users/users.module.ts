import { Module } from '@nestjs/common'
import { AuthModule } from 'src/auth/auth.module'

import { ViewerController } from './controllers/viewer.controller'
import { UserAuthService } from './services/user-auth.service'
import { UserService } from './services/users.service'

@Module({
  controllers: [ViewerController],
  providers: [UserAuthService, UserService],
  imports: [AuthModule],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UsersModule {}
