import type { S3ObjectInternal } from '@stellariscloud/types'
import { FolderPushMessage, MediaType } from '@stellariscloud/types'
import {
  mediaTypeFromExtension,
  objectIdentifierToObjectKey,
} from '@stellariscloud/utils'
import { FolderOperationName } from '@stellariscloud/workers'
import { and, eq, like, sql } from 'drizzle-orm'
import mime from 'mime'
import * as r from 'runtypes'
import { Lifecycle, scoped } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'
import type { Logger } from 'winston'

import { EnvConfigProvider } from '../../../config/env-config.provider'
import type { FolderOperationRequestPayload } from '../../../controllers/folders.controller'
import { OrmService } from '../../../orm/orm.service'
import { LoggingService } from '../../../services/logging.service'
import { QueueService } from '../../../services/queue.service'
import { configureS3Client, S3Service } from '../../../services/s3.service'
import { SocketService } from '../../../services/socket.service'
import { parseSort } from '../../../util/sort.util'
import type { Actor } from '../../auth/actor'
import { JWTService } from '../../auth/services/jwt.service'
import { FolderOperationService } from '../../folder-operation/services/folder-operation.service'
import { ServerLocationType } from '../../server/constants/server.constants'
import { ServerConfigurationService } from '../../server/services/server-configuration.service'
import type { StorageLocation } from '../../storage-location/entities/storage-location.entity'
import { storageLocationsTable } from '../../storage-location/entities/storage-location.entity'
import {
  StorageLocationInvalidError,
  StorageLocationNotFoundError,
} from '../../storage-location/errors/storage-location.error'
import type { UserLocationInputData } from '../../storage-location/transfer-objects/s3-location.dto'
import { UserService } from '../../user/services/user.service'
import type { Folder } from '../entities/folder.entity'
import { foldersTable } from '../entities/folder.entity'
import type { FolderObject } from '../entities/folder-object.entity'
import { folderObjectsTable } from '../entities/folder-object.entity'
import {
  FolderMetadataWriteNotAuthorised,
  FolderNotFoundError,
  FolderObjectNotFoundError,
  FolderPermissionMissingError,
} from '../errors/folder.error'
import type { FolderData } from '../transfer-objects/folder.dto'
import type { FolderObjectData } from '../transfer-objects/folder-object.dto'
import { transformFolderToFolderDTO } from '../transforms/folder-dto.transform'
import { transformFolderObjectToFolderObjectDTO } from '../transforms/folder-object-dto.transform'

export enum SignedURLsRequestMethod {
  PUT = 'PUT',
  DELETE = 'DELETE',
  GET = 'GET',
}

export interface SignedURLsRequest {
  objectIdentifier: string
  method: SignedURLsRequestMethod
}

export enum FolderObjectSort {
  SizeAsc = 'size-asc',
  SizeDesc = 'size-desc',
  FilenameAsc = 'filename-asc',
  FilenameDesc = 'filename-desc',
  ObjectKeyAsc = 'objectKey-asc',
  ObjectKeyDesc = 'objectKey-desc',
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  UpdatedAtAsc = 'updatedAt-asc',
  UpdatedAtDesc = 'updatedAt-desc',
}

export enum FolderSort {
  NameAsc = 'name-asc',
  NameDesc = 'name-desc',
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  UpdatedAtAsc = 'updatedAt-asc',
  UpdatedAtDesc = 'updatedAt-desc',
}

export enum FolderPermissionName {
  FOLDER_REFRESH = 'folder_refresh',
  FOLDER_MANAGE_SHARES = 'folder_manage_shares',
  FOLDER_FORGET = 'folder_forget',
  OBJECT_EDIT = 'object_edit',
  OBJECT_MANAGE = 'object_manage',
  TAG_CREATE = 'tag_create',
  TAG_ASSOCIATE = 'tag_associate',
}

const OWNER_PERMISSIONS = Object.values(FolderPermissionName)

export interface FolderObjectUpdate {
  lastModified?: number
  size?: number
  eTag?: string
}

const NewUserLocationPayloadRunType = r.Record({
  accessKeyId: r.String,
  secretAccessKey: r.String,
  endpoint: r.String,
  bucket: r.String,
  region: r.String,
  prefix: r.String,
})

const ExistingUserLocationPayloadRunType = r.Record({
  userLocationId: r.String,
  userLocationPrefixOverride: r.String,
  userLocationBucketOverride: r.String,
})

const ServerLocationPayloadRunType = r.Record({
  serverLocationId: r.String,
})

@scoped(Lifecycle.ContainerScoped)
export class FolderService {
  private readonly logger: Logger

  constructor(
    private readonly queueService: QueueService,
    private readonly serverConfigurationService: ServerConfigurationService,
    private readonly folderOperationService: FolderOperationService,
    private readonly jwtService: JWTService,
    private readonly socketService: SocketService,
    private readonly userService: UserService,
    private readonly loggingService: LoggingService,
    private readonly s3Service: S3Service,
    private readonly configProvider: EnvConfigProvider,
    private readonly ormService: OrmService,
  ) {
    this.logger = this.loggingService.logger
  }

  async createFolder({
    userId,
    body,
  }: {
    body: {
      // this is called with two location configurations (for content and metadata) which are each either:
      //  - A whole new location, meaning no existing location id, but all the other required properties
      //  - A location id of another of the user's locations, plus a bucket & prefix to replace the ones of that location
      //  - A reference to a server location (in which case no overrides are allowed)
      name: string
      contentLocation: UserLocationInputData
      metadataLocation?: UserLocationInputData
    }
    userId: string
  }): Promise<FolderData> {
    // create the ID ahead of time so we can also include
    // it in the prefix of the folders data location
    // (in the case of a Server provided location for a user folder)
    const prospectiveFolderId = uuidV4()
    const metadataPrefix = `.stellaris_folder_metadata_${prospectiveFolderId}`

    const now = new Date()
    const buildLocation = async (
      serverLocationType: ServerLocationType,
      locationInput: UserLocationInputData,
    ): Promise<StorageLocation> => {
      const withNewUserLocationConnection =
        NewUserLocationPayloadRunType.validate(locationInput)
      const withExistingUserLocation =
        ExistingUserLocationPayloadRunType.validate(locationInput)
      const withExistingServerLocation =
        ServerLocationPayloadRunType.validate(locationInput)

      let location: StorageLocation | undefined = undefined

      if (withNewUserLocationConnection.success) {
        // user has input all new location info
        location = (
          await this.ormService.db
            .insert(storageLocationsTable)
            .values({
              ...withNewUserLocationConnection.value,
              id: uuidV4(),
              name: `${withNewUserLocationConnection.value.endpoint} - ${withNewUserLocationConnection.value.accessKeyId}`,
              providerType: 'USER',
              userId,
              createdAt: now,
              updatedAt: now,
            })
            .returning()
        )[0]
      } else if (withExistingUserLocation.success) {
        // user has provided another location ID they apparently own, and a bucket + prefix override
        const existingLocation =
          await this.ormService.db.query.storageLocationsTable.findFirst({
            where: and(
              eq(storageLocationsTable.providerType, 'USER'),
              eq(storageLocationsTable.userId, userId),
              eq(
                storageLocationsTable.id,
                withExistingUserLocation.value.userLocationId,
              ),
            ),
          })
        if (existingLocation) {
          location = (
            await this.ormService.db
              .insert(storageLocationsTable)
              .values({
                id: uuidV4(),
                name: existingLocation.name,
                providerType: 'USER',
                userId,
                endpoint: existingLocation.endpoint,
                accessKeyId: existingLocation.accessKeyId,
                secretAccessKey: existingLocation.secretAccessKey,
                region: existingLocation.region,
                prefix:
                  withExistingUserLocation.value.userLocationPrefixOverride,
                bucket:
                  withExistingUserLocation.value.userLocationBucketOverride,
                createdAt: now,
                updatedAt: now,
              })
              .returning()
          )[0]
        } else {
          throw new StorageLocationNotFoundError()
        }
      } else if (withExistingServerLocation.success) {
        // user has provided a server location reference
        const existingServerLocation =
          await this.serverConfigurationService.getConfiguredServerLocationById(
            serverLocationType,
            withExistingServerLocation.value.serverLocationId,
          )

        if (!existingServerLocation) {
          throw new StorageLocationInvalidError()
        }

        location = (
          await this.ormService.db
            .insert(storageLocationsTable)
            .values({
              id: uuidV4(),
              name: existingServerLocation.name,
              providerType: 'SERVER',
              userId,
              endpoint: existingServerLocation.endpoint,
              accessKeyId: existingServerLocation.accessKeyId,
              secretAccessKey: existingServerLocation.secretAccessKey,
              region: existingServerLocation.region,
              bucket: existingServerLocation.bucket,
              prefix: `${
                existingServerLocation.prefix
                  ? existingServerLocation.prefix
                  : ''
              }${
                !existingServerLocation.prefix ||
                existingServerLocation.prefix.endsWith('/')
                  ? ''
                  : '/'
              }`,
              createdAt: now,
              updatedAt: now,
            })
            .returning()
        )[0]
      } else {
        throw new StorageLocationInvalidError()
      }

      return location
    }

    const contentLocation = await buildLocation(
      ServerLocationType.USER_CONTENT,
      body.contentLocation,
    )

    const metadataLocation = body.metadataLocation
      ? await buildLocation(
          ServerLocationType.USER_METADATA,
          body.metadataLocation,
        )
      : (
          await this.ormService.db
            .insert(storageLocationsTable)
            .values({
              ...contentLocation,
              id: uuidV4(),
              prefix: `${
                contentLocation.prefix
                  ? `${contentLocation.prefix}${
                      !contentLocation.prefix ||
                      contentLocation.prefix.endsWith('/')
                        ? ''
                        : '/'
                    }${metadataPrefix}`
                  : metadataPrefix
              }`,
            })
            .returning()
        )[0]

    // await this.ormService.db
    //   .insert(storageLocationsTable)
    //   .values(contentLocation)

    // await this.ormService.db
    //   .insert(storageLocationsTable)
    //   .values(metadataLocation)

    const folder = (
      await this.ormService.db
        .insert(foldersTable)
        .values({
          id: prospectiveFolderId,
          name: body.name,
          contentLocationId: contentLocation.id,
          metadataLocationId: metadataLocation.id,
          ownerId: userId,
          createdAt: now,
          updatedAt: now,
        })
        .returning()
    )[0]
    return transformFolderToFolderDTO({
      ...folder,
      contentLocation,
      metadataLocation,
    })
  }

  async getFolder({ folderId }: { folderId: string }) {
    const folder = await this.ormService.db.query.foldersTable.findFirst({
      where: eq(foldersTable.id, folderId),
    })
    if (!folder) {
      throw new FolderNotFoundError()
    }
    return folder
  }

  async listFoldersAsUser({
    userId,
    offset,
    limit,
  }: {
    userId: string
    offset?: number
    limit?: number
  }) {
    const folders: Folder[] =
      await this.ormService.db.query.foldersTable.findMany({
        where: eq(foldersTable.ownerId, userId),
        offset: offset ?? 0,
        limit: limit ?? 25,
        with: {
          contentLocation: true,
          metadataLocation: true,
        },
      })
    const [foldersCount] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(foldersTable)

    return {
      result: folders.map((folder) => ({ folder, permissions: [] })),
      meta: { totalCount: parseInt(foldersCount.count ?? '0', 10) },
    }
  }

  async deleteFolder({
    userId,
    folderId,
  }: {
    userId: string
    folderId: string
  }): Promise<boolean> {
    const { permissions } = await this.getFolderAsUser({
      folderId,
      userId,
    })

    if (!permissions.includes(FolderPermissionName.FOLDER_FORGET)) {
      throw new FolderPermissionMissingError()
    }

    await this.ormService.db
      .delete(foldersTable)
      .where(eq(foldersTable.id, folderId))

    return true
  }

  async deleteFolderObjectAsUser({
    userId,
    folderId,
    objectKey,
  }: {
    userId: string
    folderId: string
    objectKey: string
  }): Promise<boolean> {
    const { folder: _folder, permissions } = await this.getFolderAsUser({
      folderId,
      userId,
    })

    if (!permissions.includes(FolderPermissionName.OBJECT_EDIT)) {
      throw new FolderPermissionMissingError()
    }

    const obj = await this.ormService.db.query.folderObjectsTable.findFirst({
      where: and(
        eq(folderObjectsTable.folderId, folderId),
        eq(folderObjectsTable.objectKey, objectKey),
      ),
    })

    if (!obj) {
      throw new FolderObjectNotFoundError()
    }

    // TODO: fix delete folder
    // await this.s3Service.s3DeleteBucketObject({
    //   accessKeyId: folder.accessKeyId,
    //   secretAccessKey: folder.secretAccessKey,
    //   endpoint: folder.endpoint,
    //   region: folder.region,
    //   bucket: folder.bucket,
    //   objectKey,
    // })

    // this.folderRepository.getEntityManager().remove(obj)
    // await this.folderRepository.getEntityManager().flush()

    await this.ormService.db
      .delete(folderObjectsTable)
      .where(eq(folderObjectsTable.id, obj.id))
    return true
  }

  async getFolderMetadata({
    folderId,
    userId,
  }: {
    folderId: string
    userId: string
  }) {
    const _folder = await this.getFolderAsUser({ folderId, userId })

    const folderMetadata = await this.ormService.db
      .select({
        totalCount: sql<string | undefined>`count(*)`,
        totalSizeBytes: sql<
          string | undefined
        >`sum(${folderObjectsTable.sizeBytes})`,
      })
      .from(folderObjectsTable)
      .where(eq(folderObjectsTable.folderId, folderId))

    return {
      totalCount: parseInt(folderMetadata[0].totalCount ?? '0', 10),
      totalSizeBytes: parseInt(folderMetadata[0].totalSizeBytes ?? '0', 10),
    }
  }

  async getFolderObjectAsUser({
    objectKey,
    folderId,
    userId,
  }: {
    objectKey: string
    folderId: string
    userId: string
  }) {
    const _folder = await this.getFolderAsUser({ folderId, userId })
    const obj = await this.ormService.db.query.folderObjectsTable.findFirst({
      where: and(
        eq(folderObjectsTable.folderId, folderId),
        eq(folderObjectsTable.objectKey, objectKey),
      ),
    })
    if (!obj) {
      throw new FolderObjectNotFoundError()
    }
    return obj
  }

  async enqueueFolderOperation({
    userId,
    folderId,
    folderOperation,
  }: {
    userId: string
    folderId: string
    folderOperation: FolderOperationRequestPayload
  }) {
    const { folder } = await this.getFolderAsUser({
      folderId,
      userId,
    })

    return this.folderOperationService.enqueueFolderOperation({
      userId,
      folderId: folder.id,
      operation: folderOperation,
    })
  }

  async getFolderAsUser({
    folderId,
    userId,
  }: {
    folderId: string
    userId: string
  }): Promise<{
    folder: Folder
    permissions: FolderPermissionName[]
  }> {
    // TODO: get user specific sharing config if user is not the owner
    const folder = await this.ormService.db.query.foldersTable.findFirst({
      where: eq(foldersTable.id, folderId),
      with: {
        contentLocation: true,
        metadataLocation: true,
      },
    })

    const isOwner = folder?.ownerId === userId
    // const share = folder?.shares.getItems()?.find((s) => s.user?.id === userId)

    if (!folder || !isOwner) {
      throw new FolderNotFoundError()
    }

    return {
      folder,
      permissions: OWNER_PERMISSIONS,
      // ? OWNER_PERMISSIONS
      // : share?.shareConfiguration.permissions ?? [],
    }
  }

  async listFolderObjectsAsUser(
    actor: Actor,
    {
      folderId,
      search,
      offset = 0,
      limit = 25,
      sort = FolderObjectSort.CreatedAtAsc,
    }: {
      folderId: string
      search?: string
      offset?: number
      limit?: number
      sort?: FolderObjectSort
    },
  ) {
    const { folder } = await this.getFolderAsUser({
      folderId,
      userId: actor.id,
    })
    const folderObjects =
      await this.ormService.db.query.folderObjectsTable.findMany({
        where: eq(folderObjectsTable.folderId, folder.id),
        offset,
        limit,
        orderBy: parseSort(folderObjectsTable, sort),
      })
    const [folderObjectsCount] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(folderObjectsTable)
      .where(
        and(
          ...[eq(folderObjectsTable.folderId, folder.id)].concat(
            search ? [like(folderObjectsTable.objectKey, `%${search}%`)] : [],
          ),
        ),
      )

    return {
      result: folderObjects,
      meta: { totalCount: parseInt(folderObjectsCount.count ?? '0', 10) },
    }
  }

  // async getFolderShareAsUser({
  //   userId,
  //   folderId,
  //   shareId,
  // }: {
  //   userId: string
  //   folderId: string
  //   shareId: string
  // }) {
  //   const _folder = await this.getFolderAsUser({ userId, folderId })
  //   const share = await this.folderShareRepository.findOne({
  //     id: shareId,
  //     folder: folderId,
  //   })

  //   if (!share) {
  //     throw new FolderShareNotFoundError()
  //   }
  //   return share
  // }

  // async listFolderShares({
  //   userId,
  //   folderId,
  //   offset,
  //   limit,
  // }: {
  //   userId: string
  //   folderId: string
  //   offset?: number
  //   limit?: number
  // }) {
  //   const _folder = await this.getFolderAsUser({ userId, folderId })
  //   const [folderShares, folderSharesCount] =
  //     await this.folderShareRepository.findAndCount(
  //       {
  //         folder: folderId,
  //       },
  //       { offset: offset ?? 0, limit: limit ?? 25 },
  //     )

  //   return {
  //     result: folderShares,
  //     meta: { totalCount: folderSharesCount },
  //   }
  // }

  async indexAllUnindexedContent({
    userId,
    folderId,
  }: {
    userId: string
    folderId: string
  }): Promise<FolderObject[]> {
    const _folder = await this.getFolderAsUser({ folderId, userId })

    // const qb = this.qb('fo')

    // const results = await qb
    //   .select(['*'])
    //   .leftJoin('operations', 'fop', {
    //     'fop.operation_name': 'IndexFolderObject',
    //     'f1.operation_relation_type': 'INPUT',
    //   })
    //   .where({
    //     folder: folderId,
    //     hash: null,
    //     'fop.operation_name': null,
    //   })
    //   .groupBy('fo.id')
    //   .limit(limit)

    // return results

    // const unindexedObjects = await this.ormService.db
    //   .select('*')
    //   .from(folderObjectsTable)
    //   .where(eq(folderObjectsTable.folderId, folderId))

    // await Promise.all(
    //   unindexedObjects.map((o) => {
    //     return this.enqueueFolderOperation({
    //       userId,
    //       folderId,
    //       folderOperation: {
    //         operationData: { folderId, objectKey: o.objectKey },
    //         operationName: FolderOperationName.IndexFolderObject,
    //       },
    //     })
    //   }),
    // )
    const unindexedObjects: FolderObject[] = []
    return unindexedObjects
  }

  // async createFolderShareAsUser({
  //   userId,
  //   folderId,
  //   share,
  // }: {
  //   userId: string
  //   folderId: string
  //   share: CreateFolderSharePayload
  // }): Promise<FolderShare> {
  //   const _folder = await this.getFolderAsUser({ folderId, userId })

  //   let sharedUserId: string | undefined = undefined
  //   try {
  //     sharedUserId = await this.userService
  //       .getByEmail({
  //         email: share.userInviteEmail,
  //       })
  //       .then((u) => u.id)
  //   } catch (e) {
  //     // pass
  //   }

  //   const folderShare = this.folderShareRepository.create({
  //     folder: folderId,
  //     shareConfiguration: share.shareConfiguration,
  //     userInviteEmail: share.userInviteEmail,
  //     userLabel: share.userInviteEmail,
  //     user: sharedUserId,
  //   })
  //   await this.folderRepository.getEntityManager().flush()
  //   return folderShare
  // }

  // async updateFolderShareAsUser({
  //   userId,
  //   folderId,
  //   shareId,
  //   shareConfiguration,
  // }: {
  //   userId: string
  //   folderId: string
  //   shareId: string
  //   shareConfiguration: CreateFolderSharePayload['shareConfiguration']
  // }) {
  //   const permissionValues = Object.values(FolderPermissionName)
  //   const _folder = await this.getFolderAsUser({ folderId, userId })
  //   const share = await this.getFolderShareAsUser({ userId, folderId, shareId })
  //   shareConfiguration.permissions.forEach((p) => {
  //     if (!permissionValues.includes(p)) {
  //       throw new FolderPermissionInvalidError()
  //     }
  //   })
  //   share.shareConfiguration = shareConfiguration
  //   await this.folderRepository.getEntityManager().flush()
  //   return share
  // }

  // async deleteFolderShareAsUser({
  //   userId,
  //   folderId,
  //   shareId,
  // }: {
  //   userId: string
  //   folderId: string
  //   shareId: string
  // }): Promise<boolean> {
  //   const folder = await this.folderRepository.findOne({
  //     id: folderId,
  //     owner: userId,
  //   })

  //   if (!folder) {
  //     throw new FolderNotFoundError()
  //   }

  //   const folderShare = await this.folderShareRepository.findOne({
  //     id: shareId,
  //     folder: folderId,
  //   })
  //   if (!folderShare) {
  //     throw new FolderShareNotFoundError()
  //   }
  //   this.folderRepository.getEntityManager().remove(folderShare)
  //   await this.folderRepository.getEntityManager().flush()
  //   return true
  // }

  // async listTags({
  //   // userId,
  //   folderId,
  //   offset,
  //   limit,
  // }: {
  //   userId: string
  //   folderId: string
  //   offset?: number
  //   limit?: number
  // }) {
  //   const [objectTags, objectTagsCount] =
  //     await this.objectTagRepository.findAndCount(
  //       {
  //         folder: folderId,
  //       },
  //       { offset: offset ?? 0, limit: limit ?? 25 },
  //     )

  //   return {
  //     result: objectTags,
  //     meta: { totalCount: objectTagsCount },
  //   }
  // }

  // async createTag({
  //   userId,
  //   folderId,
  //   body,
  // }: {
  //   body: { name: string }
  //   userId: string
  //   folderId: string
  // }): Promise<ObjectTag> {
  //   const { permissions } = await this.getFolderAsUser({ folderId, userId })
  //   if (!permissions.includes(FolderPermissionName.TAG_CREATE)) {
  //     throw new FolderPermissionMissingError()
  //   }
  //   const objectTag = this.objectTagRepository.create({
  //     folder: folderId,
  //     name: body.name,
  //   })
  //   await this.objectTagRepository.getEntityManager().flush()
  //   return objectTag
  // }

  // async updateTag({
  //   userId,
  //   tagId,
  //   folderId,
  //   body,
  // }: {
  //   body: { name: string }
  //   userId: string
  //   tagId: string
  //   folderId: string
  // }) {
  //   const { permissions } = await this.getFolderAsUser({ folderId, userId })
  //   if (!permissions.includes(FolderPermissionName.TAG_CREATE)) {
  //     throw new FolderPermissionMissingError()
  //   }
  //   const objectTag = await this.objectTagRepository.findOne({
  //     id: tagId,
  //     folder: folderId,
  //   })

  //   if (!objectTag) {
  //     throw new FolderTagNotFoundError()
  //   }

  //   if (!body.name || body.name.length <= 0) {
  //     throw new FolderTagNotFoundError()
  //   }

  //   objectTag.name = body.name
  //   await this.objectTagRepository.getEntityManager().flush()
  //   return objectTag
  // }

  // async deleteTag({
  //   userId,
  //   folderId,
  //   tagId,
  // }: {
  //   userId: string
  //   folderId: string
  //   tagId: string
  // }): Promise<boolean> {
  //   const { permissions } = await this.getFolderAsUser({ folderId, userId })

  //   if (!permissions.includes(FolderPermissionName.OBJECT_EDIT)) {
  //     throw new FolderPermissionMissingError()
  //   }

  //   const tag = await this.objectTagRepository.findOne({
  //     id: tagId,
  //     folder: folderId,
  //   })

  //   if (!tag) {
  //     throw new FolderObjectNotFoundError()
  //   }

  //   this.folderRepository.getEntityManager().remove(tag)
  //   await this.folderRepository.getEntityManager().flush()
  //   return true
  // }

  async createSocketAuthenticationAsUser(userId: string, folderId: string) {
    const { folder } = await this.getFolderAsUser({ userId, folderId })
    return {
      token: this.jwtService.createFolderSocketAccessToken(userId, folder.id),
    }
  }

  async createPresignedUrlsAsUser(
    userId: string,
    folderId: string,
    urls: SignedURLsRequest[],
  ): Promise<string[]> {
    const { folder, permissions } = await this.getFolderAsUser({
      folderId,
      userId,
    })

    return this.s3Service.createS3PresignedUrls(
      urls.map((urlRequest) => {
        // objectIdentifier looks like one of these, depending on if it's a regular object content request or an object metadata request
        // `metadata:${objectKey}:${metadataObject.hash}`
        // `content:${objectKey}`
        if (
          !urlRequest.objectIdentifier.startsWith('content:') &&
          !urlRequest.objectIdentifier.startsWith('metadata:')
        ) {
          throw new FolderObjectNotFoundError()
        }

        const { isMetadataIdentifier, metadataObjectKey, objectKey } =
          objectIdentifierToObjectKey(urlRequest.objectIdentifier)
        const objectKeyToFetch = isMetadataIdentifier
          ? `${
              folder.metadataLocation.prefix
                ? folder.metadataLocation.prefix
                : ''
            }${folderId}/${metadataObjectKey}`
          : objectKey

        // validate that requested object is within the scope of this folder
        if (
          folder.contentLocation.prefix &&
          !objectKey.startsWith(folder.contentLocation.prefix)
        ) {
          throw new FolderObjectNotFoundError()
        }

        // deny access to write operations for anyone without edit perms
        if (
          [
            SignedURLsRequestMethod.DELETE,
            SignedURLsRequestMethod.PUT,
          ].includes(urlRequest.method) &&
          !permissions.includes(FolderPermissionName.OBJECT_EDIT)
        ) {
          throw new FolderPermissionMissingError()
        }

        // deny all write operations for metadata
        if (
          [
            SignedURLsRequestMethod.DELETE,
            SignedURLsRequestMethod.PUT,
          ].includes(urlRequest.method) &&
          isMetadataIdentifier
        ) {
          throw new FolderMetadataWriteNotAuthorised()
        }

        return {
          ...(isMetadataIdentifier
            ? folder.metadataLocation
            : folder.contentLocation),
          region: isMetadataIdentifier
            ? folder.metadataLocation.region
            : folder.contentLocation.region,
          method: urlRequest.method,
          objectKey: objectKeyToFetch,
          expirySeconds: 3600,
        }
      }),
    )
  }

  async queueRefreshFolder(folderId: string, userId: string) {
    return this.queueService.add(
      FolderOperationName.IndexFolder,
      { folderId, userId },
      { jobId: uuidV4() },
    )
  }

  async refreshFolder(folderId: string, userId: string) {
    const { folder, permissions } = await this.getFolderAsUser({
      folderId,
      userId,
    })
    const contentStorageLocation = folder.contentLocation

    const s3Client = configureS3Client({
      accessKeyId: contentStorageLocation.accessKeyId,
      secretAccessKey: contentStorageLocation.secretAccessKey,
      endpoint: contentStorageLocation.endpoint,
      region: contentStorageLocation.region,
    })
    if (!permissions.includes(FolderPermissionName.FOLDER_REFRESH)) {
      throw new FolderPermissionMissingError()
    }

    // delete all objects related to this folder
    await this.ormService.db
      .delete(folderObjectsTable)
      .where(eq(folderObjectsTable.folderId, folder.id))
    // TODO: implement folder object refreshing from bucket

    // consume the objects in the bucket, 1000 at a time, turning them into FolderObject entities
    let continuationToken: string | undefined = ''
    let batch: S3ObjectInternal[] = []
    while (typeof continuationToken === 'string') {
      // list objects in the bucket, with the given prefix
      const response: {
        result: S3ObjectInternal[]
        continuationToken: string | undefined
      } = await this.s3Service.s3ListBucketObjects({
        s3Client,
        bucketName: contentStorageLocation.bucket,
        continuationToken:
          !continuationToken || continuationToken === ''
            ? undefined
            : continuationToken,
        prefix: contentStorageLocation.prefix,
      })

      // swap in the new batch and the continuationToken for the next batch
      batch = response.result
      continuationToken = response.continuationToken

      for (const obj of batch) {
        const objectKey = obj.key
        if (
          objectKey.startsWith(
            `${contentStorageLocation.prefix}${
              !contentStorageLocation.prefix ||
              contentStorageLocation.prefix.endsWith('/')
                ? ''
                : '/'
            }.stellaris_folder_metadata`,
          )
        ) {
          continue
        }
        if (obj.size > 0) {
          // this is a user file
          // console.log('Trying to update key metadata [%s]:', objectKey, obj)
          await this.updateFolderObjectInDB(folder.id, objectKey, obj)
        }

        // if (!this.indexingJobContext.lastNotify) {
        //   this.indexingJobContext.lastNotify = Date.now()
        // } else if (this.indexingJobContext.lastNotify < Date.now() - 10000) {
        //   this.indexingJobContext.lastNotify = Date.now()
        //   this.sessions.forEach(({ webSocket }) => {
        //     webSocket.send(
        //       JSON.stringify({
        //         name: FolderPushMessage.REINDEX_BATCH_COMPLETE,
        //         payload: {},
        //       }),
        //     )
        //   })
        // }
      }
      console.log('Finished batch of length: %d', batch.length)
    }
  }

  async refreshFolderObjectS3MetadataAsUser(
    userId: string,
    folderId: string,
    objectKey: string,
    eTag?: string,
  ): Promise<FolderObjectData> {
    const { folder } = await this.getFolderAsUser({ folderId, userId })

    const contentStorageLocation =
      await this.ormService.db.query.storageLocationsTable.findFirst({
        where: eq(storageLocationsTable.id, folder.contentLocationId),
      })

    if (!contentStorageLocation) {
      throw new StorageLocationNotFoundError()
    }

    const s3Client = configureS3Client({
      accessKeyId: contentStorageLocation.accessKeyId,
      secretAccessKey: contentStorageLocation.secretAccessKey,
      endpoint: contentStorageLocation.endpoint,
      region: contentStorageLocation.region,
    })

    const response = await this.s3Service.s3HeadObject({
      s3Client,
      bucketName: contentStorageLocation.bucket,
      objectKey,
      eTag,
    })
    return transformFolderObjectToFolderObjectDTO(
      await this.updateFolderObjectInDB(folderId, objectKey, response),
    )
  }

  async updateFolderObjectInDB(
    folderId: string,
    objectKey: string,
    updateRecord: FolderObjectUpdate,
  ): Promise<FolderObject> {
    const now = new Date()
    const objectKeyParts = objectKey.split('.')
    const extension =
      objectKeyParts.length > 1 ? objectKeyParts.at(-1) : undefined

    let record: FolderObject | undefined = undefined
    // attempt to load existing record
    const previousRecord =
      await this.ormService.db.query.folderObjectsTable.findFirst({
        where: and(
          eq(folderObjectsTable.id, folderId),
          eq(folderObjectsTable.objectKey, objectKey),
        ),
      })
    if (previousRecord) {
      record = (
        await this.ormService.db
          .update(folderObjectsTable)
          .set({
            sizeBytes: updateRecord.size ?? 0,
            lastModified: updateRecord.lastModified ?? 0,
            eTag: updateRecord.eTag ?? '',
          })
          .returning()
      )[0]
    } else {
      record = (
        await this.ormService.db
          .insert(folderObjectsTable)
          .values({
            id: uuidV4(),
            folderId,
            objectKey,
            lastModified: updateRecord.lastModified ?? 0,
            eTag: updateRecord.eTag ?? '',
            contentAttributes: {},
            contentMetadata: {},
            sizeBytes: updateRecord.size ?? 0,
            mediaType: extension
              ? mediaTypeFromExtension(extension)
              : MediaType.Unknown,
            mimeType: extension ? mime.getType(extension) ?? '' : '',
            createdAt: now,
            updatedAt: now,
          })
          .returning()
      )[0]
    }

    this.socketService.sendToFolderRoom(
      folderId,
      previousRecord
        ? FolderPushMessage.OBJECTS_UPDATED
        : FolderPushMessage.OBJECT_ADDED,
      { folderObject: record },
    )

    return record
  }

  // async tagObject({
  //   userId,
  //   folderId,
  //   objectKey,
  //   tagId,
  // }: {
  //   userId: string
  //   folderId: string
  //   objectKey: string
  //   tagId: string
  // }) {
  //   const folderAndPermission = await this.getFolderAsUser({ folderId, userId })
  //   if (
  //     !folderAndPermission.permissions.includes(
  //       FolderPermissionName.OBJECT_MANAGE,
  //     )
  //   ) {
  //     throw new FolderPermissionMissingError()
  //   }

  //   const folderObject = await this.folderObjectRepository.findOne({
  //     objectKey,
  //     folder: folderId,
  //   })
  //   const tag = await this.objectTagRepository.findOne({
  //     id: tagId,
  //     folder: folderId,
  //   })

  //   if (!tag || !folderObject) {
  //     throw new ObjectTagInvalidError()
  //   }

  //   this.objectTagRelationRepository.create({
  //     tag: tagId,
  //     object: folderObject.id,
  //   })

  //   await this.objectTagRelationRepository.getEntityManager().flush()
  // }

  // async untagObject({
  //   userId,
  //   folderId,
  //   objectKey,
  //   tagId,
  // }: {
  //   userId: string
  //   folderId: string
  //   objectKey: string
  //   tagId: string
  // }) {
  //   const folderAndPermission = await this.getFolderAsUser({ folderId, userId })
  //   if (
  //     !folderAndPermission.permissions.includes(
  //       FolderPermissionName.OBJECT_MANAGE,
  //     )
  //   ) {
  //     throw new FolderPermissionMissingError()
  //   }

  //   const folderObject = await this.folderObjectRepository.findOne({
  //     objectKey,
  //     folder: folderId,
  //   })

  //   if (!folderObject) {
  //     throw new ObjectTagInvalidError()
  //   }

  //   const tagRelation = await this.objectTagRelationRepository.findOne({
  //     tag: tagId,
  //     object: folderObject.id,
  //   })

  //   if (!tagRelation) {
  //     throw new ObjectTagInvalidError()
  //   }

  //   await this.objectTagRelationRepository
  //     .getEntityManager()
  //     .removeAndFlush(tagRelation)
  // }
}
