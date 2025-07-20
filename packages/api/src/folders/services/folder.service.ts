import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { ModuleRef } from '@nestjs/core'
import type {
  ContentMetadataType,
  FolderPermissionName,
  S3ObjectInternal,
  UserStorageProvisionType,
} from '@stellariscloud/types'
import {
  FolderPermissionEnum,
  FolderPushMessage,
  MediaType,
  SignedURLsRequestMethod,
  UserStorageProvisionTypeEnum,
} from '@stellariscloud/types'
import {
  mediaTypeFromExtension,
  objectIdentifierToObjectKey,
  safeZodParse,
} from '@stellariscloud/utils'
import { aliasedTable, and, eq, ilike, isNotNull, or, sql } from 'drizzle-orm'
import mime from 'mime'
import { APP_NS_PREFIX, AppService } from 'src/app/services/app.service'
import { parseSort } from 'src/core/utils/sort.util'
import { EventLevel } from 'src/event/entities/event.entity'
import { EventService } from 'src/event/services/event.service'
import { OrmService } from 'src/orm/orm.service'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import { buildAccessKeyHashId } from 'src/storage/access-key.utils'
import { StorageLocationInputDTO } from 'src/storage/dto/storage-location-input.dto'
import type { StorageLocation } from 'src/storage/entities/storage-location.entity'
import { storageLocationsTable } from 'src/storage/entities/storage-location.entity'
import { StorageLocationNotFoundException } from 'src/storage/exceptions/storage-location-not-found.exceptions'
import { configureS3Client, S3Service } from 'src/storage/s3.service'
import { createS3PresignedUrls } from 'src/storage/s3.utils'
import { tasksTable } from 'src/task/entities/task.entity'
import { CoreTaskService } from 'src/task/services/core-task.service'
import { CoreTaskName } from 'src/task/task.constants'
import { type User, usersTable } from 'src/users/entities/user.entity'
import { UserNotFoundException } from 'src/users/exceptions/user-not-found.exception'
import { UserService } from 'src/users/services/users.service'
import { v4 as uuidV4 } from 'uuid'
import { z } from 'zod'

import { FolderShareDTO } from '../dto/folder-share.dto'
import { FolderShareUsersListQueryParamsDTO } from '../dto/folder-shares-list-query-params.dto'
import { FoldersListQueryParamsDTO } from '../dto/folders-list-query-params.dto'
import type { Folder } from '../entities/folder.entity'
import { foldersTable } from '../entities/folder.entity'
import type { FolderObject } from '../entities/folder-object.entity'
import { folderObjectsTable } from '../entities/folder-object.entity'
import { folderSharesTable } from '../entities/folder-share.entity'
import { FolderLocationNotFoundException } from '../exceptions/folder-location-not-found.exception'
import { FolderMetadataWriteUnauthorisedException } from '../exceptions/folder-metadata-write-unauthorized.exception'
import { FolderNotFoundException } from '../exceptions/folder-not-found.exception'
import { FolderObjectNotFoundException } from '../exceptions/folder-object-not-found.exception'
import { FolderPermissionUnauthorizedException } from '../exceptions/folder-permission-unauthorized.exception'
import { FolderShareNotFoundException } from '../exceptions/folder-share-not-found.exception'

export interface OutputUploadUrlsResponse {
  folderId: string
  objectKey: string
  url: string
}

export interface ContentMetadataPayload {
  folderId: string
  objectKey: string
  hash: string
  metadata: ContentMetadataType
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

const OWNER_PERMISSIONS = [
  FolderPermissionEnum.FOLDER_EDIT,
  FolderPermissionEnum.FOLDER_FORGET,
  FolderPermissionEnum.FOLDER_REINDEX,
  FolderPermissionEnum.OBJECT_EDIT,
  FolderPermissionEnum.OBJECT_MANAGE,
]

export interface FolderObjectUpdate {
  lastModified?: number
  size?: number
  eTag?: string
}

const customLocationPayloadSchema = z.object({
  accessKeyId: z.string(),
  secretAccessKey: z.string(),
  endpoint: z.string().refine((endpoint) => {
    new URL(endpoint)
    return true
  }),
  bucket: z.string(),
  region: z.string(),
  prefix: z.string().optional(),
})

const existingUserLocationSchema = z.object({
  userLocationId: z.string(),
  userLocationPrefixOverride: z.string(),
  userLocationBucketOverride: z.string(),
})

const serverProvisionPayloadSchema = z.object({
  storageProvisionId: z.string(),
})

@Injectable()
export class FolderService {
  eventService: EventService
  appService: AppService
  get folderSocketService(): FolderSocketService {
    return this._folderSocketService as FolderSocketService
  }
  get coreTaskService(): CoreTaskService {
    return this._coreTaskService as CoreTaskService
  }
  get s3Service(): S3Service {
    return this._s3Service as S3Service
  }
  constructor(
    private readonly moduleRef: ModuleRef,
    @Inject(forwardRef(() => S3Service))
    private readonly _s3Service,
    @Inject(forwardRef(() => FolderSocketService))
    private readonly _folderSocketService,
    @Inject(forwardRef(() => CoreTaskService))
    private readonly _coreTaskService,
    private readonly ormService: OrmService,
    private readonly serverConfigurationService: ServerConfigurationService,
    private readonly userService: UserService,
  ) {
    this.eventService = this.moduleRef.get(EventService)
    this.appService = this.moduleRef.get(AppService)
  }

  async createFolder({
    userId,
    body,
  }: {
    body: {
      // this is called with two location configurations (for content and metadata) which are each either:
      //  - A whole new location, meaning no existing location id, but all the other required properties
      //  - A location id of another of the user's locations, plus a bucket & prefix to replace the ones of that location
      //  - A reference to a server storage provision (in which case no overrides are allowed)
      name: string
      contentLocation: StorageLocationInputDTO
      metadataLocation: StorageLocationInputDTO
    }
    userId: string
  }): Promise<Folder> {
    // create the ID ahead of time so we can also include
    // it in the prefix of the folders data location
    // (in the case of a Server provided location for a user folder)
    const prospectiveFolderId = uuidV4()
    const now = new Date()
    const buildLocation = async (
      storageProvisionType: UserStorageProvisionType,
      locationInput: StorageLocationInputDTO,
    ): Promise<StorageLocation> => {
      let location: StorageLocation | undefined = undefined
      if (safeZodParse(locationInput, customLocationPayloadSchema)) {
        // user has input a custom location
        location = (
          await this.ormService.db
            .insert(storageLocationsTable)
            .values({
              ...locationInput,
              endpointDomain: new URL(locationInput.endpoint).host,
              accessKeyHashId: buildAccessKeyHashId({
                accessKeyId: locationInput.accessKeyId,
                secretAccessKey: locationInput.secretAccessKey,
                region: locationInput.region,
                endpoint: locationInput.endpoint,
              }),
              prefix: locationInput.prefix ?? '',
              id: uuidV4(),
              label: `${locationInput.endpoint} - ${locationInput.accessKeyId}`,
              providerType: 'USER',
              userId,
              createdAt: now,
              updatedAt: now,
            })
            .returning()
        )[0]
      } else if (safeZodParse(locationInput, existingUserLocationSchema)) {
        // user has provided another location ID they apparently own, and a bucket + prefix override
        const existingLocation =
          await this.ormService.db.query.storageLocationsTable.findFirst({
            where: and(
              eq(storageLocationsTable.providerType, 'USER'),
              eq(storageLocationsTable.userId, userId),
              eq(storageLocationsTable.id, locationInput.userLocationId),
            ),
          })
        if (existingLocation) {
          location = (
            await this.ormService.db
              .insert(storageLocationsTable)
              .values({
                id: uuidV4(),
                label: existingLocation.label,
                providerType: 'USER',
                userId,
                endpoint: existingLocation.endpoint,
                endpointDomain: new URL(existingLocation.endpoint).host,
                accessKeyHashId: buildAccessKeyHashId({
                  accessKeyId: existingLocation.accessKeyId,
                  secretAccessKey: existingLocation.secretAccessKey,
                  region: existingLocation.region,
                  endpoint: existingLocation.endpoint,
                }),
                accessKeyId: existingLocation.accessKeyId,
                secretAccessKey: existingLocation.secretAccessKey,
                region: existingLocation.region,
                prefix: locationInput.userLocationPrefixOverride,
                bucket: locationInput.userLocationBucketOverride,
                createdAt: now,
                updatedAt: now,
              })
              .returning()
          )[0]
        } else {
          throw new StorageLocationNotFoundException()
        }
      } else if (safeZodParse(locationInput, serverProvisionPayloadSchema)) {
        // user has provided a reference to a server supplied storage provision
        const existingServerLocation =
          await this.serverConfigurationService.getUserStorageProvisionById(
            locationInput.storageProvisionId,
          )

        if (!existingServerLocation) {
          throw new StorageLocationNotFoundException()
        }

        const prefixSuffix =
          storageProvisionType === UserStorageProvisionTypeEnum.METADATA
            ? `.stellaris_folder_metadata_${prospectiveFolderId}`
            : storageProvisionType === UserStorageProvisionTypeEnum.CONTENT
              ? `.stellaris_folder_content_${prospectiveFolderId}`
              : `.stellaris_folder_backup_${prospectiveFolderId}`

        location = (
          await this.ormService.db
            .insert(storageLocationsTable)
            .values({
              id: uuidV4(),
              label: `SERVER:${existingServerLocation.id}`,
              providerType: 'SERVER',
              userId,
              endpoint: existingServerLocation.endpoint,
              endpointDomain: new URL(existingServerLocation.endpoint).host,
              accessKeyId: existingServerLocation.accessKeyId,
              secretAccessKey: existingServerLocation.secretAccessKey,
              accessKeyHashId: buildAccessKeyHashId({
                accessKeyId: existingServerLocation.accessKeyId,
                secretAccessKey: existingServerLocation.secretAccessKey,
                region: existingServerLocation.region,
                endpoint: existingServerLocation.endpoint,
              }),
              region: existingServerLocation.region,
              bucket: existingServerLocation.bucket,
              prefix: `${
                existingServerLocation.prefix
                  ? existingServerLocation.prefix
                  : ''
              }${!existingServerLocation.prefix || existingServerLocation.prefix.endsWith('/') ? '' : '/'}${prefixSuffix}`,
              createdAt: now,
              updatedAt: now,
            })
            .returning()
        )[0]
      } else {
        console.log(
          'Got bad folder create %s location input:',
          storageProvisionType.toLowerCase(),
          {
            locationInput,
          },
        )
        throw new BadRequestException()
      }

      return location
    }

    const contentLocation = await buildLocation(
      UserStorageProvisionTypeEnum.CONTENT,
      body.contentLocation,
    )

    const metadataLocation = await buildLocation(
      UserStorageProvisionTypeEnum.METADATA,
      body.metadataLocation,
    )

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
    return {
      ...folder,
      contentLocation,
      metadataLocation,
    }
  }

  async getFolder({ folderId }: { folderId: string }) {
    const folder = await this.ormService.db.query.foldersTable.findFirst({
      where: eq(foldersTable.id, folderId),
    })
    if (!folder) {
      throw new FolderNotFoundException()
    }
    return folder
  }

  async listFoldersAsUser(
    actor: User,
    {
      offset,
      limit,
      search,
      sort = FolderSort.CreatedAtDesc,
    }: FoldersListQueryParamsDTO,
  ) {
    const contentLocationTable = aliasedTable(
      storageLocationsTable,
      'contentLocation',
    )
    const metadataLocationTable = aliasedTable(
      storageLocationsTable,
      'metadataLocation',
    )

    const folders = await this.ormService.db
      .select({
        id: foldersTable.id,
        name: foldersTable.name,
        contentLocationId: foldersTable.contentLocationId,
        metadataLocationId: foldersTable.metadataLocationId,
        ownerId: foldersTable.ownerId,
        createdAt: foldersTable.createdAt,
        updatedAt: foldersTable.updatedAt,
        contentLocation: contentLocationTable,
        metadataLocation: metadataLocationTable,
        folderShares: folderSharesTable,
        totalCount: sql<string>`count(*) over()`,
      })
      .from(foldersTable)
      .leftJoin(
        folderSharesTable,
        and(
          eq(folderSharesTable.folderId, foldersTable.id),
          eq(folderSharesTable.userId, actor.id),
        ),
      )
      .leftJoin(
        contentLocationTable,
        eq(contentLocationTable.id, foldersTable.contentLocationId),
      )
      .leftJoin(
        metadataLocationTable,
        eq(metadataLocationTable.id, foldersTable.metadataLocationId),
      )
      .where(
        and(
          or(
            eq(foldersTable.ownerId, actor.id),
            isNotNull(folderSharesTable.userId),
          ),
          search ? ilike(foldersTable.name, `%${search}%`) : undefined,
        ),
      )
      .orderBy(parseSort(foldersTable, sort))
      .limit(limit ?? 25)
      .offset(offset ?? 0)
    return {
      result: folders.map(({ totalCount, ...folder }) => ({
        folder: {
          ...folder,
          // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
          contentLocation: folder.contentLocation as NonNullable<
            typeof folder.contentLocation
          >,
          // eslint-disable-next-line @typescript-eslint/non-nullable-type-assertion-style
          metadataLocation: folder.metadataLocation as NonNullable<
            typeof folder.metadataLocation
          >,
        },
        permissions:
          folder.ownerId === actor.id
            ? OWNER_PERMISSIONS
            : (folder.folderShares?.permissions ?? []),
      })),
      meta: { totalCount: parseInt(folders[0]?.totalCount ?? '0', 10) },
    }
  }

  async deleteFolderAsUser(user: User, folderId: string): Promise<boolean> {
    const { permissions } = await this.getFolderAsUser(user, folderId)

    if (!permissions.includes(FolderPermissionEnum.FOLDER_FORGET)) {
      throw new FolderPermissionUnauthorizedException()
    }

    await this.ormService.db.transaction(async (tx) => {
      await tx
        .delete(tasksTable)
        .where(eq(tasksTable.subjectFolderId, folderId))
      await tx.delete(foldersTable).where(eq(foldersTable.id, folderId))
    })

    return true
  }

  async updateFolderAsUser(
    actor: User,
    folderId: string,
    updateData: { name: string },
  ): Promise<Folder> {
    const { folder, permissions } = await this.getFolderAsUser(actor, folderId)

    if (!permissions.includes(FolderPermissionEnum.FOLDER_EDIT)) {
      throw new FolderPermissionUnauthorizedException()
    }

    const now = new Date()
    const updatedFolder = (
      await this.ormService.db
        .update(foldersTable)
        .set({
          name: updateData.name,
          updatedAt: now,
        })
        .where(eq(foldersTable.id, folderId))
        .returning()
    )[0]

    return {
      ...updatedFolder,
      contentLocation: folder.contentLocation,
      metadataLocation: folder.metadataLocation,
    }
  }

  async deleteFolderObjectAsUser(
    actor: User,
    {
      folderId,
      objectKey,
    }: {
      folderId: string
      objectKey: string
    },
  ): Promise<boolean> {
    const { folder, permissions } = await this.getFolderAsUser(actor, folderId)

    if (!permissions.includes(FolderPermissionEnum.OBJECT_EDIT)) {
      throw new FolderPermissionUnauthorizedException()
    }

    const folderObject =
      await this.ormService.db.query.folderObjectsTable.findFirst({
        where: and(
          eq(folderObjectsTable.folderId, folderId),
          eq(folderObjectsTable.objectKey, objectKey),
        ),
      })

    if (!folderObject) {
      throw new FolderObjectNotFoundException()
    }

    await this.s3Service.s3DeleteBucketObject({
      accessKeyId: folder.contentLocation.accessKeyId,
      secretAccessKey: folder.contentLocation.secretAccessKey,
      endpoint: folder.contentLocation.endpoint,
      region: folder.contentLocation.region,
      bucket: folder.contentLocation.bucket,
      objectKey,
    })

    await this.ormService.db
      .delete(folderObjectsTable)
      .where(eq(folderObjectsTable.id, folderObject.id))

    this.folderSocketService.sendToFolderRoom(
      folderId,
      FolderPushMessage.OBJECT_REMOVED,
      { folderObject },
    )

    return true
  }

  async getFolderMetadata(actor: User, folderId: string) {
    const { folder } = await this.getFolderAsUser(actor, folderId)

    const folderMetadata = await this.ormService.db
      .select({
        totalCount: sql<string | undefined>`count(*)`,
        totalSizeBytes: sql<
          string | undefined
        >`sum(${folderObjectsTable.sizeBytes})`,
      })
      .from(folderObjectsTable)
      .where(eq(folderObjectsTable.folderId, folder.id))

    return {
      totalCount: parseInt(folderMetadata[0].totalCount ?? '0', 10),
      totalSizeBytes: parseInt(folderMetadata[0].totalSizeBytes ?? '0', 10),
    }
  }

  async getFolderObjectAsUser(
    actor: User,
    {
      objectKey,
      folderId,
    }: {
      objectKey: string
      folderId: string
    },
  ) {
    const { folder } = await this.getFolderAsUser(actor, folderId)
    const obj = await this.ormService.db.query.folderObjectsTable.findFirst({
      where: and(
        eq(folderObjectsTable.folderId, folder.id),
        eq(folderObjectsTable.objectKey, objectKey),
      ),
    })
    if (!obj) {
      throw new FolderObjectNotFoundException()
    }
    return obj
  }

  async getFolderAsUser(
    actor: User,
    folderId: string,
  ): Promise<{
    folder: Folder
    permissions: FolderPermissionName[]
  }> {
    const folder = await this.ormService.db.query.foldersTable.findFirst({
      where: eq(foldersTable.id, folderId),
      with: {
        contentLocation: true,
        metadataLocation: true,
      },
    })

    if (!folder) {
      throw new FolderNotFoundException()
    }

    const isOwner = folder.ownerId === actor.id
    if (isOwner) {
      return {
        folder,
        permissions: OWNER_PERMISSIONS,
      }
    }

    // If not owner, check for share permissions
    const share = await this.ormService.db.query.folderSharesTable.findFirst({
      where: and(
        eq(folderSharesTable.folderId, folder.id),
        eq(folderSharesTable.userId, actor.id),
      ),
    })

    if (!share) {
      throw new FolderNotFoundException()
    }

    return {
      folder,
      permissions: share.permissions,
    }
  }

  async listFolderObjectsAsUser(
    actor: User,
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
    const { folder } = await this.getFolderAsUser(actor, folderId)
    const where = and(
      ...[eq(folderObjectsTable.folderId, folder.id)].concat(
        search ? [ilike(folderObjectsTable.objectKey, `%${search}%`)] : [],
      ),
    )
    const folderObjects =
      await this.ormService.db.query.folderObjectsTable.findMany({
        where,
        offset,
        limit,
        orderBy: parseSort(folderObjectsTable, sort),
      })
    const [folderObjectsCount] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(folderObjectsTable)
      .where(where)

    return {
      result: folderObjects,
      meta: { totalCount: parseInt(folderObjectsCount.count ?? '0', 10) },
    }
  }

  async createPresignedUrlsAsUser(
    actor: User,
    {
      folderId,
      urls,
    }: {
      folderId: string
      urls: SignedURLsRequest[]
    },
  ): Promise<string[]> {
    const { folder, permissions } = await this.getFolderAsUser(actor, folderId)

    return createS3PresignedUrls(
      urls.map((urlRequest) => {
        // objectIdentifier looks like one of these, depending on if it's a regular object content request or an object metadata request
        // `metadata:${objectKey}:${metadataObject.hash}`
        // `content:${objectKey}`
        if (
          !urlRequest.objectIdentifier.startsWith('content:') &&
          !urlRequest.objectIdentifier.startsWith('metadata:')
        ) {
          throw new BadRequestException(
            'In createS3PresignedUrls, objectIdentifier should start with "content:" or "metadata:"',
          )
        }
        try {
          const { isMetadataIdentifier, objectKey, metadataHash } =
            objectIdentifierToObjectKey(urlRequest.objectIdentifier)
          const absoluteObjectKey = isMetadataIdentifier
            ? `${folder.metadataLocation.prefix}${folder.metadataLocation.prefix.length > 0 && !folder.metadataLocation.prefix.endsWith('/') ? '/' : ''}${objectKey}/${metadataHash}`
            : `${folder.contentLocation.prefix}${folder.contentLocation.prefix.length > 0 && !folder.contentLocation.prefix.endsWith('/') ? '/' : ''}${objectKey}`

          // deny access to write operations for anyone without edit perms
          if (
            [
              SignedURLsRequestMethod.DELETE,
              SignedURLsRequestMethod.PUT,
            ].includes(urlRequest.method) &&
            !permissions.includes(FolderPermissionEnum.OBJECT_EDIT)
          ) {
            throw new FolderPermissionUnauthorizedException()
          }

          // deny all write operations for metadata
          if (
            isMetadataIdentifier &&
            urlRequest.method !== SignedURLsRequestMethod.GET
          ) {
            throw new FolderMetadataWriteUnauthorisedException()
          }

          return {
            ...(isMetadataIdentifier
              ? folder.metadataLocation
              : folder.contentLocation),
            region: isMetadataIdentifier
              ? folder.metadataLocation.region
              : folder.contentLocation.region,
            method: urlRequest.method,
            objectKey: absoluteObjectKey,
            expirySeconds: 3600,
          }
        } catch (e: unknown) {
          if (
            e &&
            typeof e === 'object' &&
            'constructor' in e &&
            e.constructor.name === 'BadObjectIdentifierError'
          ) {
            throw new FolderLocationNotFoundException()
          }
          throw e
        }
      }),
    )
  }

  queueReindexFolder(folderId: string, userId: string) {
    return this.coreTaskService.addAsyncTask(
      CoreTaskName.REINDEX_FOLDER,
      {
        folderId,
        userId,
      },
      { folderId },
    )
  }

  async reindexFolder({
    folderId,
    userId,
  }: {
    folderId: string
    userId: string
  }) {
    const actor = await this.userService.getUserById({ id: userId })
    const { folder, permissions } = await this.getFolderAsUser(actor, folderId)
    const contentStorageLocation = folder.contentLocation

    const s3Client = configureS3Client({
      accessKeyId: contentStorageLocation.accessKeyId,
      secretAccessKey: contentStorageLocation.secretAccessKey,
      endpoint: contentStorageLocation.endpoint,
      region: contentStorageLocation.region,
    })
    if (!permissions.includes(FolderPermissionEnum.FOLDER_REINDEX)) {
      throw new FolderPermissionUnauthorizedException()
    }

    // delete all objects related to this folder
    await this.ormService.db
      .delete(folderObjectsTable)
      .where(eq(folderObjectsTable.folderId, folder.id))

    // consume the objects in the bucket, 1000 at a time, turning them into FolderObject entities
    let _contentCount = 0
    let continuationToken: string | undefined = ''
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
      for (const obj of response.result) {
        const objectKey = folder.contentLocation.prefix.length
          ? obj.key.slice(
              folder.contentLocation.prefix.length +
                (folder.contentLocation.prefix.endsWith('/') ? 0 : 1),
            )
          : obj.key
        if (objectKey.startsWith('.stellaris_')) {
          continue
        }
        if (obj.size > 0) {
          _contentCount++
          // console.log('Trying to update key metadata [%s]:', objectKey, obj)
          await this.updateFolderObjectInDB(folder.id, objectKey, obj)
        }
      }
      // console.log(
      //   'Finished batch: %s',
      //   JSON.stringify(
      //     {
      //       length: response.result.length,
      //       contentCount,
      //       metadataCount,
      //     },
      //     null,
      //     2,
      //   ),
      // )
      continuationToken = response.continuationToken
    }
  }

  async refreshFolderObjectS3MetadataAsUser(
    actor: User,
    {
      folderId,
      objectKey,
      eTag,
    }: {
      folderId: string
      objectKey: string
      eTag?: string
    },
  ): Promise<FolderObject> {
    const { folder } = await this.getFolderAsUser(actor, folderId)

    const contentStorageLocation =
      await this.ormService.db.query.storageLocationsTable.findFirst({
        where: eq(storageLocationsTable.id, folder.contentLocationId),
      })

    if (!contentStorageLocation) {
      throw new NotFoundException(
        `Storage location not found by id "${folder.contentLocationId}"`,
      )
    }

    const absoluteObjectKey = `${contentStorageLocation.prefix}${contentStorageLocation.prefix.endsWith('/') ? '' : '/'}${objectKey}`

    const s3Client = configureS3Client({
      accessKeyId: contentStorageLocation.accessKeyId,
      secretAccessKey: contentStorageLocation.secretAccessKey,
      endpoint: contentStorageLocation.endpoint,
      region: contentStorageLocation.region,
    })

    const response = await this.s3Service.s3HeadObject({
      s3Client,
      bucketName: contentStorageLocation.bucket,
      objectKey: absoluteObjectKey,
      eTag,
    })
    return this.updateFolderObjectInDB(folderId, objectKey, response)
  }

  async handleAppTaskTrigger(
    actor: User,
    {
      folderId,
      appIdentifier,
      taskKey,
      inputParams,
      objectKey,
    }: {
      folderId: string
      appIdentifier: string
      taskKey: string
      inputParams: unknown // TODO: improve
      objectKey?: string
    },
  ): Promise<void> {
    const _folderAndPermissions = await this.getFolderAsUser(actor, folderId)
    // console.log('Handling Action:', {
    //   taskKey,
    //   folderId,
    //   appIdentifier,
    //   actionParams,
    //   objectKey,
    // })
    await this.eventService.emitEvent({
      emitterIdentifier: `${APP_NS_PREFIX}${appIdentifier.toLowerCase()}`,
      locationContext: folderId ? { folderId, objectKey } : undefined,
      userId: actor.id,
      level: EventLevel.INFO,
      data: { inputParams },
      eventKey: `TRIGGER_TASK:${appIdentifier.toUpperCase()}:${taskKey}`,
    })
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
          eq(folderObjectsTable.folderId, folderId),
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
            contentMetadata: {},
            sizeBytes: updateRecord.size ?? 0,
            mediaType: extension
              ? mediaTypeFromExtension(extension)
              : MediaType.Unknown,
            mimeType: extension ? (mime.getType(extension) ?? '') : '',
            createdAt: now,
            updatedAt: now,
          })
          .returning()
      )[0]
    }

    this.folderSocketService.sendToFolderRoom(
      folderId,
      previousRecord
        ? FolderPushMessage.OBJECT_UPDATED
        : FolderPushMessage.OBJECT_ADDED,
      { folderObject: record },
    )

    await this.eventService.emitEvent({
      emitterIdentifier: 'core',
      eventKey: previousRecord ? 'CORE:OBJECT_UPDATED' : 'CORE:OBJECT_ADDED',
      level: EventLevel.INFO,
      locationContext: {
        folderId: record.folderId,
        objectKey: record.objectKey,
      },
      data: record,
    })

    return record
  }

  async updateFolderObjectMetadata(
    payload: ContentMetadataPayload[],
  ): Promise<void> {
    for (const { folderId, objectKey, hash, metadata } of payload) {
      const folderObject =
        await this.ormService.db.query.folderObjectsTable.findFirst({
          where: and(
            eq(folderObjectsTable.folderId, folderId),
            eq(folderObjectsTable.objectKey, objectKey),
          ),
        })

      if (!folderObject) {
        throw new FolderObjectNotFoundException()
      }

      const updates = {
        hash,
        contentMetadata: {
          ...folderObject.contentMetadata,
          [hash]: { ...folderObject.contentMetadata[hash], ...metadata },
        },
      }

      const updatedObject = (
        await this.ormService.db
          .update(folderObjectsTable)
          .set(updates)
          .where(eq(folderObjectsTable.id, folderObject.id))
          .returning()
      )[0]

      this.folderSocketService.sendToFolderRoom(
        folderId,
        FolderPushMessage.OBJECT_UPDATED,
        updatedObject,
      )
    }
  }
  async getFolderShare(
    actor: User,
    folderId: string,
    userId: string,
  ): Promise<FolderShareDTO> {
    const share = await this.ormService.db.query.folderSharesTable.findFirst({
      where: and(
        eq(folderSharesTable.userId, userId),
        eq(folderSharesTable.folderId, folderId),
      ),
    })
    if (!share) {
      throw new FolderShareNotFoundException()
    }
    return share
  }

  async listFolderShares(
    actor: User,
    folderId: string,
  ): Promise<{
    result: { userId: string; permissions: FolderPermissionName[] }[]
    meta: { totalCount: number }
  }> {
    const { folder } = await this.getFolderAsUser(actor, folderId)
    const shares = await this.ormService.db.query.folderSharesTable.findMany({
      where: eq(folderSharesTable.folderId, folder.id),
    })

    return {
      result: shares.map((share) => ({
        userId: share.userId,
        permissions: share.permissions,
      })),
      meta: { totalCount: shares.length },
    }
  }

  async listFolderShareUsersAsUser(
    actor: User,
    folderId: string,
    { offset, limit, search }: FolderShareUsersListQueryParamsDTO,
  ) {
    const { folder: _folder } = await this.getFolderAsUser(actor, folderId)

    const where = search ? ilike(usersTable.username, `%${search}%`) : undefined

    const users: User[] = await this.ormService.db.query.usersTable.findMany({
      where,
      offset: offset ?? 0,
      limit: limit ?? 25,
    })
    const [usersCount] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(usersTable)
      .where(where)

    return {
      result: users.map((user) => ({ id: user.id, username: user.username })),
      meta: { totalCount: parseInt(usersCount.count ?? '0', 10) },
    }
  }

  async upsertFolderShare(
    actor: User,
    folderId: string,
    userId: string,
    permissions: FolderPermissionName[],
  ): Promise<FolderShareDTO> {
    const { folder } = await this.getFolderAsUser(actor, folderId)
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    })
    if (!user) {
      throw new UserNotFoundException()
    }

    const where = and(
      eq(folderSharesTable.folderId, folder.id),
      eq(folderSharesTable.userId, userId),
    )

    const existingShare =
      await this.ormService.db.query.folderSharesTable.findFirst({
        where,
      })

    if (existingShare) {
      await this.ormService.db
        .update(folderSharesTable)
        .set({ permissions })
        .where(where)
    } else {
      await this.ormService.db.insert(folderSharesTable).values({
        folderId,
        userId,
        permissions,
      })
    }
    return {
      userId,
      permissions,
    }
  }

  async removeFolderShare(
    actor: User,
    folderId: string,
    userId: string,
  ): Promise<void> {
    const { folder } = await this.getFolderAsUser(actor, folderId)
    const user = await this.ormService.db.query.usersTable.findFirst({
      where: eq(usersTable.id, userId),
    })
    if (!user) {
      throw new UserNotFoundException()
    }

    await this.ormService.db
      .delete(folderSharesTable)
      .where(
        and(
          eq(folderSharesTable.folderId, folder.id),
          eq(folderSharesTable.userId, userId),
        ),
      )
      .execute()
  }
}
