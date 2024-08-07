import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import { and, countDistinct, eq, or, SQLWrapper } from 'drizzle-orm'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { OrmService } from 'src/orm/orm.service'
import { S3Service } from 'src/storage/s3.service'
import { User } from 'src/users/entities/user.entity'

import { RotateAccessKeyInputDTO } from './dto/rotate-access-key-input.dto'
import { storageLocationsTable } from './entities/storage-location.entity'

@Injectable()
export class StorageLocationService {
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

  async listAccessKeysAsUser(
    actor: User,
    {
      offset,
      limit,
    }: {
      offset?: number
      limit?: number
    },
  ) {
    const accessKeys: {
      endpointHost: string
      accessKeyId: string
    }[] = await this.ormService.db
      .selectDistinct({
        endpointHost: storageLocationsTable.endpointHost,
        accessKeyId: storageLocationsTable.accessKeyId,
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

    const accessKeysCountResult: { count: number }[] = await this.ormService.db
      .select({
        count: countDistinct([
          storageLocationsTable.endpointHost,
          storageLocationsTable.accessKeyId,
        ] as unknown as SQLWrapper), // TODO: not sure why this type hack is necessary
      })
      .from(storageLocationsTable)
      .where(
        and(
          eq(storageLocationsTable.providerType, 'USER'),
          eq(storageLocationsTable.userId, actor.id),
        ),
      )

    const folderCounts: {
      endpointHost: string
      accessKeyId: string
      count: number
    }[] = await this.ormService.db
      .select({
        endpointHost: storageLocationsTable.endpointHost,
        accessKeyId: storageLocationsTable.accessKeyId,
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
        storageLocationsTable.endpointHost,
        storageLocationsTable.accessKeyId,
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
        [`${next.endpointHost}_${next.accessKeyId}`]: next.count,
      }),
      {},
    )
    return {
      result: accessKeys.map((accessKey) => ({
        ...accessKey,
        folderCount:
          mappedFolderCounts[
            `${accessKey.endpointHost}_${accessKey.accessKeyId}`
          ] ?? 0,
      })),
      meta: { totalCount: accessKeysCountResult[0].count },
    }
  }

  async rotateAccessKeyAsUser(actor: User, input: RotateAccessKeyInputDTO) {
    // the where clause for all storage locations owned by this user and matching the given accessKeyId
    const where = and(
      eq(storageLocationsTable.accessKeyId, input.accessKeyId),
      eq(storageLocationsTable.userId, actor.id),
      eq(storageLocationsTable.providerType, 'USER'),
    )

    const accessKeyLocation =
      await this.ormService.db.query.storageLocationsTable.findFirst({
        where,
      })

    if (!accessKeyLocation) {
      // no storage locations exist matching the given accessKeyId
      throw new NotFoundException()
    }

    await this.ormService.db
      .update(storageLocationsTable)
      .set({
        accessKeyId: input.newAccessKeyId,
        secretAccessKey: input.newSecretAccessKey,
      })
      .where(where)
  }

  async listServerAccessKeysAsAdmin(
    actor: User,
    {
      offset,
      limit,
    }: {
      offset?: number
      limit?: number
    },
  ) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }
    const accessKeys: {
      endpointHost: string
      accessKeyId: string
    }[] = await this.ormService.db
      .selectDistinct({
        endpointHost: storageLocationsTable.endpointHost,
        accessKeyId: storageLocationsTable.accessKeyId,
      })
      .from(storageLocationsTable)
      .leftJoin(
        foldersTable,
        eq(foldersTable.contentLocationId, storageLocationsTable.id),
      )
      .where(and(eq(storageLocationsTable.providerType, 'SERVER')))
      .offset(offset ?? 0)
      .limit(limit ?? 25)

    const accessKeysCountResult: { count: number }[] = await this.ormService.db
      .select({
        count: countDistinct([
          storageLocationsTable.endpointHost,
          storageLocationsTable.accessKeyId,
        ] as unknown as SQLWrapper), // TODO: not sure why this type hack is necessary
      })
      .from(storageLocationsTable)
      .where(and(eq(storageLocationsTable.providerType, 'SERVER')))

    const folderCounts: {
      endpointHost: string
      accessKeyId: string
      count: number
    }[] = await this.ormService.db
      .select({
        endpointHost: storageLocationsTable.endpointHost,
        accessKeyId: storageLocationsTable.accessKeyId,
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
        storageLocationsTable.endpointHost,
        storageLocationsTable.accessKeyId,
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
        [`${next.endpointHost}_${next.accessKeyId}`]: next.count,
      }),
      {},
    )
    return {
      result: accessKeys.map((accessKey) => ({
        ...accessKey,
        folderCount:
          mappedFolderCounts[
            `${accessKey.endpointHost}_${accessKey.accessKeyId}`
          ] ?? 0,
      })),
      meta: { totalCount: accessKeysCountResult[0].count },
    }
  }

  async rotateAccessKeyAsAdmin(actor: User, input: RotateAccessKeyInputDTO) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    // the where clause for all storage locations owned by the server and matching the given accessKeyId
    const where = and(
      eq(storageLocationsTable.accessKeyId, input.accessKeyId),
      eq(storageLocationsTable.providerType, 'SERVER'),
    )

    const accessKeyLocation =
      await this.ormService.db.query.storageLocationsTable.findFirst({
        where,
      })

    if (!accessKeyLocation) {
      // no storage locations exist matching the given accessKeyId
      throw new NotFoundException()
    }

    await this.ormService.db
      .update(storageLocationsTable)
      .set({
        accessKeyId: input.newAccessKeyId,
        secretAccessKey: input.newSecretAccessKey,
      })
      .where(where)
  }
}
