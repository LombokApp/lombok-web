import { Injectable } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { S3Service } from 'src/core/services/s3.service'
import { OrmService } from 'src/orm/orm.service'

import { locationsTable } from '../entities/locations.entity'

@Injectable()
export class LocationsService {
  constructor(
    private readonly ormService: OrmService,
    private readonly s3Service: S3Service,
  ) {}

  async listServerLocationsAsUser(_userId: string) {
    // TODO: check ACL
    // TODO: add type filter
    const results =
      await this.ormService.db.query.storageLocationsTable.findMany({
        where: eq(locationsTable.providerType, 'SERVER'),
      })

    return results
  }

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
