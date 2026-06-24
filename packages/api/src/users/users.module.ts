import { forwardRef, Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AuthModule } from 'src/auth/auth.module'
import { coreConfig } from 'src/core/config'
import { StorageProvisionService } from 'src/server/services/storage-provision.service'
import { S3Service } from 'src/storage/s3.service'
import { StorageModule } from 'src/storage/storage.module'

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
    StorageProvisionService,
  ],
  exports: [UserService, UserAvatarService],
  imports: [
    forwardRef(() => AuthModule),
    ConfigModule.forFeature(coreConfig),
    StorageModule,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class UsersModule {}
