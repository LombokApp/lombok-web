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

import { AccessKeyDTO } from './dto/access-key.dto'
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
      endpointDomain: string
      accessKeyId: string
    }[] = await this.ormService.db
      .selectDistinct({
        endpointDomain: storageLocationsTable.endpointDomain,
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
          storageLocationsTable.endpointDomain,
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
      endpointDomain: string
      accessKeyId: string
      count: number
    }[] = await this.ormService.db
      .select({
        endpointDomain: storageLocationsTable.endpointDomain,
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
        storageLocationsTable.endpointDomain,
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
        [`${next.endpointDomain}_${next.accessKeyId}`]: next.count,
      }),
      {},
    )
    return {
      result: accessKeys.map((accessKey) => ({
        ...accessKey,
        folderCount:
          mappedFolderCounts[
            `${accessKey.endpointDomain}_${accessKey.accessKeyId}`
          ] ?? 0,
      })),
      meta: { totalCount: accessKeysCountResult[0].count },
    }
  }

  async rotateAccessKeyAsUser(
    actor: User,
    input: {
      accessKeyId: string
      endpointDomain: string
      newAccessKey: RotateAccessKeyInputDTO
    },
  ) {
    // the where clause for all storage locations owned by this user and matching the given input
    const where = and(
      eq(storageLocationsTable.accessKeyId, input.accessKeyId),
      eq(storageLocationsTable.endpointDomain, input.endpointDomain),
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

    await this.ormService.db
      .update(storageLocationsTable)
      .set({
        accessKeyId: input.newAccessKey.accessKeyId,
        secretAccessKey: input.newAccessKey.secretAccessKey,
      })
      .where(where)
  }

  async getAccessKeyAsUser(
    actor: User,
    input: { endpointDomain: string; accessKeyId: string },
  ): Promise<AccessKeyDTO> {
    const accessKeyLocation =
      await this.ormService.db.query.storageLocationsTable.findFirst({
        where: and(
          eq(storageLocationsTable.accessKeyId, input.accessKeyId),
          eq(storageLocationsTable.endpointDomain, input.endpointDomain),
          eq(storageLocationsTable.userId, actor.id),
          eq(storageLocationsTable.providerType, 'USER'),
        ),
      })

    if (!accessKeyLocation) {
      // no storage locations exist matching the given input
      throw new NotFoundException()
    }
    return {
      accessKeyId: accessKeyLocation.accessKeyId,
      endpointDomain: accessKeyLocation.endpointDomain,
      folderCount: 1,
    }
  }

  async getServerAccessKeyAsAdmin(
    actor: User,
    input: { endpointDomain: string; accessKeyId: string },
  ): Promise<AccessKeyDTO> {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    const accessKeyLocation =
      await this.ormService.db.query.storageLocationsTable.findFirst({
        where: and(
          eq(storageLocationsTable.accessKeyId, input.accessKeyId),
          eq(storageLocationsTable.endpointDomain, input.endpointDomain),
          eq(storageLocationsTable.providerType, 'SERVER'),
        ),
      })

    if (!accessKeyLocation) {
      // no storage locations exist matching the given input
      throw new NotFoundException()
    }
    return {
      accessKeyId: accessKeyLocation.accessKeyId,
      endpointDomain: accessKeyLocation.endpointDomain,
      folderCount: 1,
    }
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
      endpointDomain: string
      accessKeyId: string
    }[] = await this.ormService.db
      .selectDistinct({
        endpointDomain: storageLocationsTable.endpointDomain,
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
          storageLocationsTable.endpointDomain,
          storageLocationsTable.accessKeyId,
        ] as unknown as SQLWrapper), // TODO: not sure why this type hack is necessary
      })
      .from(storageLocationsTable)
      .where(and(eq(storageLocationsTable.providerType, 'SERVER')))

    const folderCounts: {
      endpointDomain: string
      accessKeyId: string
      count: number
    }[] = await this.ormService.db
      .select({
        endpointDomain: storageLocationsTable.endpointDomain,
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
        storageLocationsTable.endpointDomain,
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
        [`${next.endpointDomain}_${next.accessKeyId}`]: next.count,
      }),
      {},
    )
    return {
      result: accessKeys.map((accessKey) => ({
        ...accessKey,
        folderCount:
          mappedFolderCounts[
            `${accessKey.endpointDomain}_${accessKey.accessKeyId}`
          ] ?? 0,
      })),
      meta: { totalCount: accessKeysCountResult[0].count },
    }
  }

  async rotateAccessKeyAsAdmin(
    actor: User,
    input: {
      accessKeyId: string
      endpointDomain: string
      newAccessKey: RotateAccessKeyInputDTO
    },
  ) {
    if (!actor.isAdmin) {
      throw new UnauthorizedException()
    }

    // the where clause for all storage locations owned by the server and matching the given input
    const where = and(
      eq(storageLocationsTable.accessKeyId, input.accessKeyId),
      eq(storageLocationsTable.endpointDomain, input.endpointDomain),
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

    await this.ormService.db
      .update(storageLocationsTable)
      .set({
        accessKeyId: input.newAccessKey.accessKeyId,
        secretAccessKey: input.newAccessKey.secretAccessKey,
      })
      .where(where)
  }
}
