import { Module } from '@nestjs/common'

import { S3Service } from './s3.service'
import { StorageLocationsService } from './storage-location.service'

@Module({
  controllers: [],
  providers: [S3Service, StorageLocationsService],
  exports: [S3Service, StorageLocationsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class S3Module {}
