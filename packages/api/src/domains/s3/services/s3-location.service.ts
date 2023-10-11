import { Lifecycle, scoped } from 'tsyringe'
import type { Logger } from 'winston'

import { EnvConfigProvider } from '../../../config/env-config.provider'
import { LoggingService } from '../../../services/logging.service'
import { S3Service } from '../../../services/s3.service'
import { S3Location } from '../entities/s3-location.entity'
import { S3LocationRepository } from '../entities/s3-location.repository'

@scoped(Lifecycle.ContainerScoped)
export class S3LocationService {
  private readonly logger: Logger

  constructor(
    private readonly config: EnvConfigProvider,
    private readonly s3LocationRepository: S3LocationRepository,
    private readonly s3Service: S3Service,
    private readonly loggingService: LoggingService,
  ) {
    this.logger = this.loggingService.logger
  }

  async listServerLocationsAsUser(_userId: string) {
    // TODO: check ACL
    // TODO: add type filter
    const results = await this.s3LocationRepository
      .getEntityManager()
      .find(S3Location, { endpoint: '' })
    return results.map((result) => result.toS3LocationData())
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

  // async deleteS3Connection({
  //   userId,
  //   s3ConnectionId,
  // }: {
  //   userId: string
  //   s3ConnectionId: string
  // }): Promise<boolean> {
  //   const s3Connection = await this.s3ConnectionRepository.findOne({
  //     id: s3ConnectionId,
  //     owner: userId,
  //   })

  //   if (!s3Connection) {
  //     throw new S3ConnectionNotFoundError()
  //   }
  //   this.s3ConnectionRepository.getEntityManager().remove(s3Connection)
  //   await this.s3ConnectionRepository.getEntityManager().flush()
  //   return true
  // }

  // async getS3Connection({ s3ConnectionId }: { s3ConnectionId: string }) {
  //   const s3Connection = await this.s3ConnectionRepository.findOne({
  //     id: s3ConnectionId,
  //   })

  //   if (!s3Connection) {
  //     throw new S3ConnectionNotFoundError()
  //   }

  //   return s3Connection
  // }

  // async listS3Connections({
  //   userId,
  //   offset,
  //   limit,
  // }: {
  //   userId: string
  //   offset?: number
  //   limit?: number
  // }) {
  //   const [folders, foldersCount] =
  //     await this.s3ConnectionRepository.findAndCount(
  //       {
  //         owner: userId,
  //       },
  //       { offset: offset ?? 0, limit: limit ?? 25 },
  //     )

  //   return { result: folders, meta: { totalCount: foldersCount } }
  // }

  // async createServerLocationAsAdmin(
  //   userId: string,
  //   locationType: AdminLocationType,
  //   location: S3LocationInputData,
  // ) {
  //   // TODO: ACL
  //   const withExistingS3Connection =
  //     CreateS3LocationWithExistingConnectionPayloadRunType.validate(location)
  //   const withoutExistingS3Connection =
  //     CreateS3LocationWithNewConnectionPayloadRunType.validate(location)

  //   let s3Connection: S3Connection | null = null

  //   if (withExistingS3Connection.success) {
  //     s3Connection = await this.s3ConnectionRepository.findOne({
  //       id: withExistingS3Connection.value.connectionId,
  //       connectionType: ConnectionType.SERVER,
  //     })
  //     if (!s3Connection) {
  //       throw new S3ConnectionNotFoundError()
  //     }
  //   } else if (withoutExistingS3Connection.success) {
  //     s3Connection = this.s3ConnectionRepository.create({
  //       connectionType: ConnectionType.SERVER,
  //       endpoint: withoutExistingS3Connection.value.endpoint,
  //       accessKeyId: withoutExistingS3Connection.value.accessKeyId,
  //       secretAccessKey: withoutExistingS3Connection.value.secretAccessKey,
  //       region: withoutExistingS3Connection.value.region,
  //       name: withoutExistingS3Connection.value.name,
  //     })
  //   } else {
  //     throw new S3LocationInvalidError()
  //   }

  //   const s3Location = this.s3LocationRepository.create({
  //     bucket: location.bucket,
  //     name: location.name,
  //     locationType,
  //     prefix: location.prefix,
  //     s3Connection,
  //   })

  //   return s3Location
  // }

  // async createS3LocationAsUser(userId: string, location: S3LocationInputData) {
  //   // TODO: ACL
  //   const withExistingS3Connection =
  //     CreateS3LocationWithExistingConnectionPayloadRunType.validate(location)
  //   const withoutExistingS3Connection =
  //     CreateS3LocationWithNewConnectionPayloadRunType.validate(location)

  //   let s3Connection: S3Connection | null = null

  //   if (withExistingS3Connection.success) {
  //     s3Connection = await this.s3ConnectionRepository.findOne({
  //       id: withExistingS3Connection.value.connectionId,
  //       connectionType: ConnectionType.SERVER,
  //     })
  //     if (!s3Connection) {
  //       throw new S3ConnectionNotFoundError()
  //     }
  //   } else if (withoutExistingS3Connection.success) {
  //     s3Connection = this.s3ConnectionRepository.create({
  //       connectionType: ConnectionType.SERVER,
  //       endpoint: withoutExistingS3Connection.value.endpoint,
  //       accessKeyId: withoutExistingS3Connection.value.accessKeyId,
  //       secretAccessKey: withoutExistingS3Connection.value.secretAccessKey,
  //       region: withoutExistingS3Connection.value.region,
  //       name: withoutExistingS3Connection.value.name,
  //     })
  //   } else {
  //     throw new S3LocationInvalidError()
  //   }

  //   const s3Location = this.s3LocationRepository.create({
  //     bucket: location.bucket,
  //     name: location.name,
  //     locationType: 'USER_FOLDER',
  //     prefix: location.prefix,
  //     s3Connection,
  //   })

  //   return s3Location
  // }
}
