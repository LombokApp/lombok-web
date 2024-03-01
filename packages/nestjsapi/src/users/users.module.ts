import { Module } from '@nestjs/common'

import { ViewerController } from './controllers/viewer.controller'
import { UserAuthService } from './services/user-auth.service'
import { UserService } from './services/users.service'

@Module({
  controllers: [ViewerController],
  providers: [UserAuthService, UserService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UsersModule {}
