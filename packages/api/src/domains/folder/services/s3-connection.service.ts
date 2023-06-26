import { Lifecycle, scoped } from 'tsyringe'
import type { Logger } from 'winston'

import { EnvConfigProvider } from '../../../config/env-config.provider'
import { LoggingService } from '../../../services/logging.service'
import { S3Service } from '../../../services/s3.service'
import type { S3Connection } from '../entities/s3-connection.entity'
import { S3ConnectionRepository } from '../entities/s3-connection.repository'
import { S3ConnectionNotFoundError } from '../errors/s3-connection.error'

export enum S3ConnectionSort {
  NameAsc = 'name-asc',
  NameDesc = 'name-desc',
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  UpdatedAtAsc = 'updatedAt-asc',
  UpdatedAtDesc = 'updatedAt-desc',
}

@scoped(Lifecycle.ContainerScoped)
export class S3ConnectionService {
  private readonly logger: Logger

  constructor(
    private readonly config: EnvConfigProvider,
    private readonly s3ConnectionRepository: S3ConnectionRepository,
    private readonly s3Service: S3Service,
    private readonly loggingService: LoggingService,
  ) {
    this.logger = this.loggingService.logger
  }

  async createS3Connection({
    userId,
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
  }): Promise<S3Connection> {
    const s3Connection = this.s3ConnectionRepository.create({
      name: body.name,
      accessKeyId: body.accessKeyId,
      secretAccessKey: body.secretAccessKey,
      endpoint: body.endpoint,
      region: body.region,
      owner: userId,
    })
    await this.s3ConnectionRepository.getEntityManager().flush()
    return s3Connection
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

  async deleteS3Connection({
    userId,
    s3ConnectionId,
  }: {
    userId: string
    s3ConnectionId: string
  }): Promise<boolean> {
    const s3Connection = await this.s3ConnectionRepository.findOne({
      id: s3ConnectionId,
      owner: userId,
    })

    if (!s3Connection) {
      throw new S3ConnectionNotFoundError()
    }
    this.s3ConnectionRepository.getEntityManager().remove(s3Connection)
    await this.s3ConnectionRepository.getEntityManager().flush()
    return true
  }

  async getS3Connection({ s3ConnectionId }: { s3ConnectionId: string }) {
    const s3Connection = await this.s3ConnectionRepository.findOne({
      id: s3ConnectionId,
    })

    if (!s3Connection) {
      throw new S3ConnectionNotFoundError()
    }

    return s3Connection
  }

  async listS3Connections({
    userId,
    offset,
    limit,
  }: {
    userId: string
    offset?: number
    limit?: number
  }) {
    const [folders, foldersCount] =
      await this.s3ConnectionRepository.findAndCount(
        {
          owner: userId,
        },
        { offset: offset ?? 0, limit: limit ?? 25 },
      )

    return { result: folders, meta: { totalCount: foldersCount } }
  }
}
