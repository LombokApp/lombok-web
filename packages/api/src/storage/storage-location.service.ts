import { Injectable } from '@nestjs/common'
import { OrmService } from 'src/orm/orm.service'
import { S3Service } from 'src/storage/s3.service'

@Injectable()
export class StorageLocationsService {
  constructor(
    private readonly ormService: OrmService,
    private readonly s3Service: S3Service,
  ) {}

  async testS3Connection({
    // userId,
    body,
  }: {
    body: {
      name: string
      accessKeyId: string
      secretAccessKey: string
      endpoint: string
      region?: string
    }
    userId: string
  }): Promise<boolean> {
    return this.s3Service.testS3Connection(body)
  }
}
