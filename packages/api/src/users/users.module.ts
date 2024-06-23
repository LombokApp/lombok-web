import { forwardRef, Global, Module } from '@nestjs/common'
import { AuthModule } from 'src/auth/auth.module'

import { ViewerController } from './controllers/viewer.controller'
import { UserAuthService } from './services/user-auth.service'
import { UserService } from './services/users.service'

@Global()
@Module({
  controllers: [ViewerController],
  providers: [UserAuthService, UserService],
  exports: [UserService],
  imports: [forwardRef(() => AuthModule)],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UsersModule {}
