import { Module } from '@nestjs/common'
import { S3Module } from 'src/s3/s3.module'

import { LocationsService } from './services/locations.service'

@Module({
  imports: [S3Module],
  controllers: [],
  providers: [LocationsService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class LocationsModule {}
