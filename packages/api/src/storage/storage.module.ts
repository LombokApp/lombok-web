import { Module } from '@nestjs/common'

import { AccessKeysController } from './controllers/access-keys.controller'
import { ServerAccessKeysController } from './controllers/server-access-keys.controller'
import { S3Service } from './s3.service'
import { StorageLocationService } from './storage-location.service'

@Module({
  controllers: [AccessKeysController, ServerAccessKeysController],
  providers: [S3Service, StorageLocationService],
  exports: [S3Service, StorageLocationService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class StorageModule {}
