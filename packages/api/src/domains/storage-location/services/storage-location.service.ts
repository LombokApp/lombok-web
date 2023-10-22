import { eq } from 'drizzle-orm'
import { Lifecycle, scoped } from 'tsyringe'
import type { Logger } from 'winston'

import { EnvConfigProvider } from '../../../config/env-config.provider'
import { OrmService } from '../../../orm/orm.service'
import { LoggingService } from '../../../services/logging.service'
import { S3Service } from '../../../services/s3.service'
import { storageLocationsTable } from '../entities/storage-location.entity'

@scoped(Lifecycle.ContainerScoped)
export class StorageLocationService {
  private readonly logger: Logger

  constructor(
    private readonly config: EnvConfigProvider,
    private readonly ormService: OrmService,
    private readonly s3Service: S3Service,
    private readonly loggingService: LoggingService,
  ) {
    this.logger = this.loggingService.logger
  }

  async listServerLocationsAsUser(_userId: string) {
    // TODO: check ACL
    // TODO: add type filter
    const results =
      await this.ormService.db.query.storageLocationsTable.findMany({
        where: eq(storageLocationsTable.providerType, 'SERVER'),
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
