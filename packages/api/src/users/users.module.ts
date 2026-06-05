import { forwardRef, Global, Module } from '@nestjs/common'
import { AuthModule } from 'src/auth/auth.module'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { S3Service } from 'src/storage/s3.service'

import { UserAvatarController } from './controllers/user-avatar.controller'
import { UsersController } from './controllers/users.controller'
import { ViewerController } from './controllers/viewer.controller'
import { UserAvatarService } from './services/user-avatar.service'
import { UserService } from './services/users.service'

@Global()
@Module({
  controllers: [ViewerController, UsersController, UserAvatarController],
  providers: [
    UserService,
    UserAvatarService,
    S3Service,
    ServerConfigurationService,
  ],
  exports: [UserService, UserAvatarService],
  imports: [forwardRef(() => AuthModule)],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UsersModule {}
