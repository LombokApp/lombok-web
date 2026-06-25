import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { coreConfig } from 'src/core/config'

import { AccessKeysController } from './controllers/access-keys.controller'
import { ServerAccessKeysController } from './controllers/server-access-keys.controller'
import { S3Service } from './s3.service'
import { StorageLocationService } from './storage-location.service'

@Module({
  imports: [ConfigModule.forFeature(coreConfig)],
  controllers: [AccessKeysController, ServerAccessKeysController],
  providers: [S3Service, StorageLocationService],
  exports: [S3Service, StorageLocationService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StorageModule {}
