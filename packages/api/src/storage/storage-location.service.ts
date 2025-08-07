import { S3ServiceException } from '@aws-sdk/client-s3'
import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { accessKeyPublicSchema, accessKeySchema } from '@stellariscloud/types'
import { and, count, countDistinct, eq, or, SQLWrapper } from 'drizzle-orm'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { OrmService } from 'src/orm/orm.service'
import { parseSort } from 'src/platform/utils/sort.util'
import { configureS3Client, S3Service } from 'src/storage/s3.service'
import { User } from 'src/users/entities/user.entity'
import { z } from 'zod'

import { buildAccessKeyHashId } from './access-key.utils'
import { RotateAccessKeyInputDTO } from './dto/rotate-access-key-input.dto'
import { storageLocationsTable } from './entities/storage-location.entity'

export enum AccessKeySort {
  AccessKeyIdAsc = 'accessKeyId-asc',
  AccessKeyIdDesc = 'accessKeyId-desc',
  AccessKeyHashIdAsc = 'accessKeyHashId-asc',
  AccessKeyHashIdDesc = 'accessKeyHashId-desc',
  EndpointAsc = 'endpoint-asc',
  EndpointDesc = 'endpoint-desc',
  RegionAsc = 'region-asc',
  RegionDesc = 'region-desc',
}
@Injectable()
export class StorageLocationService {
  constructor(
    private readonly ormService: OrmService,
    private readonly s3Service: S3Service,
  ) {}

  testS3Connection({
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

  async listAccessKeysAsUser(
    actor: User,
    {
      offset,
      limit,
      sort = [AccessKeySort.AccessKeyIdAsc],
    }: {
      offset?: number
      limit?: number
      sort?: AccessKeySort[]
    },
  ) {
    const accessKeys = await this.ormService.db
      .selectDistinct({
        endpoint: storageLocationsTable.endpoint,
        endpointDomain: storageLocationsTable.endpointDomain,
        accessKeyId: storageLocationsTable.accessKeyId,
        accessKeyHashId: storageLocationsTable.accessKeyHashId,
        secretAccessKey: storageLocationsTable.secretAccessKey,
        region: storageLocationsTable.region,
      })
      .from(storageLocationsTable)
      .leftJoin(
        foldersTable,
        eq(foldersTable.contentLocationId, storageLocationsTable.id),
      )
      .where(
        and(
          eq(storageLocationsTable.providerType, 'USER'),
          eq(storageLocationsTable.userId, actor.id),
        ),
      )
      .offset(offset ?? 0)
      .limit(limit ?? 25)
      .orderBy(...parseSort(storageLocationsTable, sort))

    const accessKeysCountResult = await this.ormService.db
      .select({
        count: countDistinct([
          storageLocationsTable.endpointDomain,
          storageLocationsTable.endpoint,
          storageLocationsTable.secretAccessKey,
          storageLocationsTable.accessKeyId,
          storageLocationsTable.accessKeyHashId,
          storageLocationsTable.region,
        ] as unknown as SQLWrapper), // TODO: not sure why this type hack is necessary
      })
      .from(storageLocationsTable)
      .where(
        and(
          eq(storageLocationsTable.providerType, 'USER'),
          eq(storageLocationsTable.userId, actor.id),
        ),
      )

    const folderCounts = await this.ormService.db
      .select({
        endpointDomain: storageLocationsTable.endpointDomain,
        endpoint: storageLocationsTable.endpoint,
        accessKeyId: storageLocationsTable.accessKeyId,
        accessKeyHashId: storageLocationsTable.accessKeyHashId,
        region: storageLocationsTable.region,
        secretAccessKey: storageLocationsTable.secretAccessKey,
        count: countDistinct(foldersTable),
      })
      .from(foldersTable)
      .innerJoin(
        storageLocationsTable,
        or(
          eq(foldersTable.contentLocationId, storageLocationsTable.id),
          eq(foldersTable.metadataLocationId, storageLocationsTable.id),
        ),
      )
      .groupBy(
        storageLocationsTable.endpointDomain,
        storageLocationsTable.endpoint,
        storageLocationsTable.accessKeyId,
        storageLocationsTable.accessKeyHashId,
        storageLocationsTable.region,
        storageLocationsTable.secretAccessKey,
      )
      .where(
        and(
          eq(foldersTable.ownerId, actor.id),
          eq(storageLocationsTable.providerType, 'USER'),
        ),
      )

    const mappedFolderCounts = folderCounts.reduce(
      (acc, next) => ({
        ...acc,
        [next.accessKeyHashId]: next.count,
      }),
      {},
    )
    return {
      result: accessKeys.map((accessKey) => ({
        ...accessKey,
        folderCount:
          (mappedFolderCounts[accessKey.accessKeyHashId] as
            | number
            | undefined) ?? 0,
      })),
      meta: { totalCount: accessKeysCountResult[0].count },
    }
  }

  async rotateAccessKeyAsUser(
    actor: User,
    input: {
      accessKeyHashId: string
      newAccessKey: RotateAccessKeyInputDTO
    },
  ) {
    const accessKey = await this.getAccessKeyAsUser(
      actor,
      input.accessKeyHashId,
    )
    // the where clause for all storage locations owned by this user and matching the given input
    const where = and(
      eq(storageLocationsTable.accessKeyHashId, input.accessKeyHashId),
      eq(storageLocationsTable.userId, actor.id),
      eq(storageLocationsTable.providerType, 'USER'),
    )

    const accessKeyLocation =
      await this.ormService.db.query.storageLocationsTable.findFirst({
        where,
      })

    if (!accessKeyLocation) {
      // no storage locations exist matching the given input
      throw new NotFoundException()
    }
    const newHashId = buildAccessKeyHashId({
      ...input.newAccessKey,
      endpoint: accessKey.endpoint,
      region: accessKey.region,
    })
    await this.ormService.db
      .update(storageLocationsTable)
      .set({
        accessKeyId: input.newAccessKey.accessKeyId,
        secretAccessKey: input.newAccessKey.secretAccessKey,
        accessKeyHashId: newHashId,
      })
      .where(where)
    return newHashId
  }

  async listAccessKeyBucketsAsUser(actor: User, accessKeyHashId: string) {
    const accessKey = await this.getAccessKeyAsUser(actor, accessKeyHashId)
    const location =
      await this.ormService.db.query.storageLocationsTable.findFirst({
        where: and(
          eq(storageLocationsTable.accessKeyHashId, accessKeyHashId),
          eq(storageLocationsTable.userId, actor.id),
          eq(storageLocationsTable.providerType, 'USER'),
        ),
      })
    // TODO: if user has deleted their folders, this could be undefined, right?
    if (!location) {
      throw new NotFoundException()
    }
    const buckets = await this.s3Service
      .s3ListBuckets({
        s3Client: configureS3Client({
          accessKeyId: accessKey.accessKeyId,
          secretAccessKey: location.secretAccessKey,
          endpoint: location.endpoint,
          region: location.region,
        }),
      })
      .catch((e) => {
        if (e instanceof S3ServiceException) {
          if (e.name === 'InvalidAccessKeyId') {
            throw new BadRequestException('InvalidAccessKeyId')
          } else if (e.name === 'AccessDenied') {
            throw new UnauthorizedException('AccessDenied')
          }
          throw new BadRequestException(
            `Unexpected error reading bucket: ${e.name}`,
          )
        }
        throw e
      })

    return buckets
  }

  async listAccessKeyBucketsAsAdmin(actor: User, accessKeyHashId: string) {
    const accessKey = await this.getServerAccessKeyAsAdmin(
      actor,
      accessKeyHashId,
    )
    const location =
      await this.ormService.db.query.storageLocationsTable.findFirst({
        where: and(
          eq(storageLocationsTable.accessKeyHashId, accessKeyHashId),
          eq(storageLocationsTable.providerType, 'SERVER'),
        ),
      })
    // TODO: if no user has created a folder using this access key, this could be undefined, right?
    if (!location) {
      throw new NotFoundException()
    }
    const buckets = await this.s3Service
      .s3ListBuckets({
        s3Client: configureS3Client({
          accessKeyId: accessKey.accessKeyId,
          secretAccessKey: location.secretAccessKey,
          endpoint: accessKey.endpoint,
          region: accessKey.region,
        }),
      })
      .catch((e) => {
        if (
          e instanceof S3ServiceException &&
          e.name === 'InvalidAccessKeyId'
        ) {
          throw new NotFoundException()
        }
        throw e
      })

    return buckets
  }

  async getAccessKeyAsUser(
    actor: User,
    accessKeyHashId: string,
  ): Promise<z.infer<typeof accessKeyPublicSchema>> {
    const where = and(
      eq(storageLocationsTable.accessKeyHashId, accessKeyHashId),
      eq(storageLocationsTable.userId, actor.id),
      eq(storageLocationsTable.providerType, 'USER'),
    )
    const accessKeyLocation =
      await this.ormService.db.query.storageLocationsTable.findFirst({
        where,
      })

    if (!accessKeyLocation) {
      // no storage locations exist matching the given input
      throw new NotFoundException()
    }
    return {
      accessKeyHashId: accessKeyLocation.accessKeyHashId,
      accessKeyId: accessKeyLocation.accessKeyId,
      endpoint: accessKeyLocation.endpoint,
      endpointDomain: accessKeyLocation.endpointDomain,
      region: accessKeyLocation.region,
      folderCount: await this.ormService.db
        .select({ folderCount: count() })
        .from(foldersTable)
        .where(where)
        .innerJoin(
          storageLocationsTable,
          or(
            eq(foldersTable.contentLocationId, storageLocationsTable.id),
            eq(foldersTable.metadataLocationId, storageLocationsTable.id),
          ),
        )
        .then(([{ folderCount }]) => folderCount),
    }
  }

  async getServerAccessKeyAsAdmin(
    actor: User,
    accessKeyHashId: string,
  ): Promise<z.infer<typeof accessKeySchema>> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const where = and(
      eq(storageLocationsTable.accessKeyHashId, accessKeyHashId),
      eq(storageLocationsTable.providerType, 'SERVER'),
    )
    const accessKeyLocation =
      await this.ormService.db.query.storageLocationsTable.findFirst({
        where,
      })

    if (!accessKeyLocation) {
      // no storage locations exist matching the given input
      throw new NotFoundException()
    }
    return {
      accessKeyHashId: accessKeyLocation.accessKeyHashId,
      secretAccessKey: accessKeyLocation.secretAccessKey,
      accessKeyId: accessKeyLocation.accessKeyId,
      endpoint: accessKeyLocation.endpoint,
      endpointDomain: accessKeyLocation.endpointDomain,
      region: accessKeyLocation.region,
      folderCount: await this.ormService.db
        .select({ folderCount: count() })
        .from(foldersTable)
        .where(where)
        .innerJoin(
          storageLocationsTable,
          or(
            eq(foldersTable.contentLocationId, storageLocationsTable.id),
            eq(foldersTable.metadataLocationId, storageLocationsTable.id),
          ),
        )
        .then(([{ folderCount }]) => folderCount),
    }
  }

  async listServerAccessKeysAsAdmin(
    actor: User,
    {
      offset,
      limit,
      sort = [AccessKeySort.AccessKeyIdAsc],
    }: {
      offset?: number
      limit?: number
      sort?: AccessKeySort[]
    },
  ) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const accessKeys = await this.ormService.db
      .selectDistinct({
        endpoint: storageLocationsTable.endpoint,
        endpointDomain: storageLocationsTable.endpointDomain,
        accessKeyId: storageLocationsTable.accessKeyId,
        accessKeyHashId: storageLocationsTable.accessKeyHashId,
        secretAccessKey: storageLocationsTable.secretAccessKey,
        region: storageLocationsTable.region,
      })
      .from(storageLocationsTable)
      .leftJoin(
        foldersTable,
        eq(foldersTable.contentLocationId, storageLocationsTable.id),
      )
      .where(and(eq(storageLocationsTable.providerType, 'SERVER')))
      .offset(offset ?? 0)
      .limit(limit ?? 25)
      .orderBy(...parseSort(storageLocationsTable, sort))

    const accessKeysCountResult = await this.ormService.db
      .select({
        count: countDistinct([
          storageLocationsTable.endpoint,
          storageLocationsTable.endpointDomain,
          storageLocationsTable.accessKeyId,
          storageLocationsTable.accessKeyHashId,
          storageLocationsTable.secretAccessKey,
          storageLocationsTable.region,
        ] as unknown as SQLWrapper), // TODO: not sure why this type hack is necessary
      })
      .from(storageLocationsTable)
      .where(and(eq(storageLocationsTable.providerType, 'SERVER')))

    const folderCounts = await this.ormService.db
      .select({
        accessKeyHashId: storageLocationsTable.accessKeyHashId,
        endpointDomain: storageLocationsTable.endpointDomain,
        endpoint: storageLocationsTable.endpoint,
        accessKeyId: storageLocationsTable.accessKeyId,
        secretAccessKey: storageLocationsTable.secretAccessKey,
        region: storageLocationsTable.region,
        count: countDistinct(foldersTable),
      })
      .from(foldersTable)
      .innerJoin(
        storageLocationsTable,
        or(
          eq(foldersTable.contentLocationId, storageLocationsTable.id),
          eq(foldersTable.metadataLocationId, storageLocationsTable.id),
        ),
      )
      .groupBy(
        storageLocationsTable.endpoint,
        storageLocationsTable.accessKeyHashId,
        storageLocationsTable.endpointDomain,
        storageLocationsTable.accessKeyId,
        storageLocationsTable.region,
        storageLocationsTable.secretAccessKey,
      )
      .where(
        and(
          eq(foldersTable.ownerId, actor.id),
          eq(storageLocationsTable.providerType, 'SERVER'),
        ),
      )

    const mappedFolderCounts = folderCounts.reduce(
      (acc, next) => ({
        ...acc,
        [next.accessKeyHashId]: next.count,
      }),
      {},
    )
    return {
      result: accessKeys.map((accessKey) => ({
        ...accessKey,
        folderCount:
          (mappedFolderCounts[accessKey.accessKeyHashId] as
            | number
            | undefined) ?? 0,
      })),
      meta: { totalCount: accessKeysCountResult[0].count },
    }
  }

  async rotateAccessKeyAsAdmin(
    actor: User,
    input: {
      accessKeyHashId: string
      newAccessKey: RotateAccessKeyInputDTO
    },
  ) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    // the where clause for all storage locations owned by the server and matching the given input
    const where = and(
      eq(storageLocationsTable.accessKeyHashId, input.accessKeyHashId),
      eq(storageLocationsTable.providerType, 'SERVER'),
    )

    const accessKeyLocation =
      await this.ormService.db.query.storageLocationsTable.findFirst({
        where,
      })

    if (!accessKeyLocation) {
      // no storage locations exist matching the given input
      throw new NotFoundException()
    }
    const newHashId = buildAccessKeyHashId({
      ...input.newAccessKey,
      endpoint: accessKeyLocation.endpoint,
      region: accessKeyLocation.region,
    })
    await this.ormService.db
      .update(storageLocationsTable)
      .set({
        accessKeyId: input.newAccessKey.accessKeyId,
        secretAccessKey: input.newAccessKey.secretAccessKey,
        accessKeyHashId: buildAccessKeyHashId({
          ...input.newAccessKey,
          endpoint: accessKeyLocation.endpoint,
          region: accessKeyLocation.region,
        }),
      })
      .where(where)
    return newHashId
  }
}
