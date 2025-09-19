import { forwardRef, Global, Module } from '@nestjs/common'
import { AuthModule } from 'src/auth/auth.module'

import { UsersController } from './controllers/users.controller'
import { ViewerController } from './controllers/viewer.controller'
import { UserService } from './services/users.service'

@Global()
@Module({
  controllers: [ViewerController, UsersController],
  providers: [UserService],
  exports: [UserService],
  imports: [forwardRef(() => AuthModule)],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UsersModule {}
