import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { coreConfig } from 'src/core/config'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { StorageProvisionService } from 'src/server/services/storage-provision.service'

import { AccessKeysController } from './controllers/access-keys.controller'
import { ServerAccessKeysController } from './controllers/server-access-keys.controller'
import { StagingUploadController } from './controllers/staging-upload.controller'
import { S3Service } from './s3.service'
import { StagingUploadService } from './staging-upload.service'
import { StorageLocationService } from './storage-location.service'

@Module({
  imports: [ConfigModule.forFeature(coreConfig)],
  controllers: [
    AccessKeysController,
    ServerAccessKeysController,
    StagingUploadController,
  ],
  providers: [
    S3Service,
    StorageLocationService,
    StagingUploadService,
    ServerConfigurationService,
    StorageProvisionService,
  ],
  exports: [S3Service, StorageLocationService, StagingUploadService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StorageModule {}
