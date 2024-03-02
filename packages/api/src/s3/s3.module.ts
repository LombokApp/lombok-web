import { Module } from '@nestjs/common'

import { S3Service } from './s3.service'

@Module({
  controllers: [],
  providers: [S3Service],
  exports: [S3Service],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class S3Module {}
