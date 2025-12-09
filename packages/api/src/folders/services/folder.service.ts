import type {
  ContentMetadataType,
  FolderPermissionName,
  InlineMetadataEntry,
  JsonSerializableObject,
  PreviewMetadata,
  S3ObjectInternal,
  StorageProvisionType,
} from '@lombokapp/types'
import {
  FolderPermissionEnum,
  FolderPushMessage,
  MediaType,
  PLATFORM_IDENTIFIER,
  PlatformEvent,
  previewMetadataSchema,
  SignedURLsRequestMethod,
  StorageProvisionTypeEnum,
} from '@lombokapp/types'
import {
  mediaTypeFromMimeType,
  mimeFromExtension,
  objectIdentifierToObjectKey,
  safeZodParse,
} from '@lombokapp/utils'
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { ModuleRef } from '@nestjs/core'
import {
  aliasedTable,
  and,
  eq,
  gt,
  ilike,
  inArray,
  isNotNull,
  lt,
  or,
  type SQL,
  sql,
} from 'drizzle-orm'
import { PgColumn } from 'drizzle-orm/pg-core'
import { AppService } from 'src/app/services/app.service'
import { eventsTable } from 'src/event/entities/event.entity'
import { EventService } from 'src/event/services/event.service'
import { OrmService } from 'src/orm/orm.service'
import { platformConfig } from 'src/platform/config'
import { parseSort } from 'src/platform/utils/sort.util'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import { buildAccessKeyHashId } from 'src/storage/access-key.utils'
import { StorageLocationInputDTO } from 'src/storage/dto/storage-location-input.dto'
import type { StorageLocation } from 'src/storage/entities/storage-location.entity'
import { storageLocationsTable } from 'src/storage/entities/storage-location.entity'
import { StorageLocationNotFoundException } from 'src/storage/exceptions/storage-location-not-found.exceptions'
import { StorageProvisionNotFoundException } from 'src/storage/exceptions/storage-provision-not-found.exceptions'
import { configureS3Client, S3Service } from 'src/storage/s3.service'
import { createS3PresignedUrls } from 'src/storage/s3.utils'
import { tasksTable } from 'src/task/entities/task.entity'
import { PlatformTaskService } from 'src/task/services/platform-task.service'
import { TaskService } from 'src/task/services/task.service'
import { PlatformTaskName } from 'src/task/task.constants'
import { type User, usersTable } from 'src/users/entities/user.entity'
import { UserNotFoundException } from 'src/users/exceptions/user-not-found.exception'
import { UserService } from 'src/users/services/users.service'
import { v4 as uuidV4 } from 'uuid'
import { z } from 'zod'

import { FolderShareDTO } from '../dto/folder-share.dto'
import { FolderShareUsersListQueryParamsDTO } from '../dto/folder-shares-list-query-params.dto'
import type { Folder } from '../entities/folder.entity'
import { foldersTable } from '../entities/folder.entity'
import type { FolderObject } from '../entities/folder-object.entity'
import { folderObjectsTable } from '../entities/folder-object.entity'
import { folderSharesTable } from '../entities/folder-share.entity'
import { FolderLocationNotFoundException } from '../exceptions/folder-location-not-found.exception'
import { FolderMetadataWriteUnauthorisedException } from '../exceptions/folder-metadata-write-unauthorized.exception'
import { FolderNotFoundException } from '../exceptions/folder-not-found.exception'
import { FolderObjectNotFoundException } from '../exceptions/folder-object-not-found.exception'
import { FolderOperationForbiddenException } from '../exceptions/folder-operation-forbidden.exception'
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
  SizeBytesAsc = 'sizeBytes-asc',
  SizeBytesDesc = 'sizeBytes-desc',
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
  mimeType?: string
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
  get platformTaskService(): PlatformTaskService {
    return this._platformTaskService as PlatformTaskService
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
    @Inject(forwardRef(() => PlatformTaskService))
    private readonly _platformTaskService,
    private readonly ormService: OrmService,
    private readonly serverConfigurationService: ServerConfigurationService,
    private readonly taskService: TaskService,
    private readonly userService: UserService,
    @Inject(platformConfig.KEY)
    private readonly _platformConfig: nestjsConfig.ConfigType<
      typeof platformConfig
    >,
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
      storageProvisionType: StorageProvisionType,
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
        const storageProvision =
          await this.serverConfigurationService.getStorageProvisionById(
            locationInput.storageProvisionId,
          )

        if (!storageProvision) {
          throw new StorageProvisionNotFoundException()
        }

        const prefixSuffix =
          storageProvisionType === StorageProvisionTypeEnum.METADATA
            ? `.lombok_folder_metadata_${prospectiveFolderId}`
            : storageProvisionType === StorageProvisionTypeEnum.CONTENT
              ? `.lombok_folder_content_${prospectiveFolderId}`
              : `.lombok_folder_backup_${prospectiveFolderId}`

        location = (
          await this.ormService.db
            .insert(storageLocationsTable)
            .values({
              id: uuidV4(),
              label: `SERVER:${storageProvision.id}`,
              providerType: 'SERVER',
              userId,
              endpoint: storageProvision.endpoint,
              endpointDomain: new URL(storageProvision.endpoint).host,
              accessKeyId: storageProvision.accessKeyId,
              secretAccessKey: storageProvision.secretAccessKey,
              accessKeyHashId: buildAccessKeyHashId({
                accessKeyId: storageProvision.accessKeyId,
                secretAccessKey: storageProvision.secretAccessKey,
                region: storageProvision.region,
                endpoint: storageProvision.endpoint,
              }),
              region: storageProvision.region,
              bucket: storageProvision.bucket,
              prefix: `${
                storageProvision.prefix ? storageProvision.prefix : ''
              }${!storageProvision.prefix || storageProvision.prefix.endsWith('/') ? '' : '/'}${prefixSuffix}`,
              createdAt: now,
              updatedAt: now,
            })
            .returning()
        )[0]
      } else {
        throw new BadRequestException()
      }

      return location
    }

    const contentLocation = await buildLocation(
      StorageProvisionTypeEnum.CONTENT,
      body.contentLocation,
    )

    const metadataLocation = await buildLocation(
      StorageProvisionTypeEnum.METADATA,
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

    await this.checkAndUpdateFolderAccessError(folder.id)

    return {
      ...(await this.getFolder({ folderId: folder.id })),
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

  async checkAndUpdateFolderAccessError(folderId: string): Promise<void> {
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

    let accessError: { message: string; code: string } | undefined

    try {
      const s3Client = configureS3Client({
        accessKeyId: folder.contentLocation.accessKeyId,
        secretAccessKey: folder.contentLocation.secretAccessKey,
        endpoint: folder.contentLocation.endpoint,
        region: folder.contentLocation.region,
      })
      // Try to list with limit 1 to validate access
      try {
        await this.s3Service.s3ListBucketObjects({
          s3Client,
          bucketName: folder.contentLocation.bucket,
          prefix: folder.contentLocation.prefix,
        })
      } catch (e) {
        accessError = {
          code: 'S3_ACCESS_DENIED',
          message:
            e && typeof e === 'object' && 'message' in e
              ? String((e as Error).message)
              : 'Unable to access bucket',
        }
      }

      // Only run CORS check if bucket access looked fine
      if (!accessError) {
        // Perform a CORS preflight (OPTIONS) with an Origin header; HEAD/GET without Origin
        // won't include CORS headers even if CORS is properly configured.
        const objectKey =
          folder.contentLocation.prefix &&
          folder.contentLocation.prefix.length > 0
            ? `${folder.contentLocation.prefix}${folder.contentLocation.prefix.endsWith('/') ? '' : '/'}.lombok_cors_check_${folderId}`
            : `.lombok_cors_check_${folderId}`
        const corsUrl = `${folder.contentLocation.endpoint.replace(/\/$/, '')}/${folder.contentLocation.bucket}/${objectKey}`
        const appPlatformHost: string = this._platformConfig.platformHost
        const originCandidates = [
          `https://${appPlatformHost}`,
          `http://${appPlatformHost}`,
        ]
        let corsOk = false
        for (const origin of originCandidates) {
          try {
            const response = await fetch(corsUrl, {
              method: 'OPTIONS',
              headers: {
                Origin: origin,
                'Access-Control-Request-Method': 'GET',
              },
            })
            const acao = response.headers.get('access-control-allow-origin')
            const acam = response.headers.get('access-control-allow-methods')
            // Consider valid if ACAO is '*' or echoes our Origin or contains hostId
            const originMatches =
              !!acao &&
              (acao === '*' ||
                acao === origin ||
                acao.includes(appPlatformHost))
            const methodsOk = !!acam && acam.toUpperCase().includes('GET')
            if (originMatches && methodsOk) {
              corsOk = true
              break
            }
          } catch {
            // try next origin variant
          }
        }

        if (!corsOk) {
          accessError = {
            code: 'S3_CORS_INVALID',
            message: `CORS configuration may not allow browser access from the configured frontend domain (${appPlatformHost}).`,
          }
        }
      }
    } catch (e) {
      accessError = {
        code: 'S3_ACCESS_ERROR',
        message:
          e && typeof e === 'object' && 'message' in e
            ? String((e as Error).message)
            : 'Unknown S3 access error',
      }
    }

    await this.ormService.db
      .update(foldersTable)
      .set({ accessError: accessError ?? null, updatedAt: new Date() })
      .where(eq(foldersTable.id, folderId))
  }

  async listFoldersAsUser(
    actor: User,
    {
      offset,
      limit,
      search,
      sort = [FolderSort.CreatedAtDesc],
    }: {
      search?: string
      offset?: number
      limit?: number
      sort?: FolderSort[]
    },
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
        accessError: foldersTable.accessError,
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
      .orderBy(...parseSort(foldersTable, sort))
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
      throw new FolderOperationForbiddenException()
    }

    await this.ormService.db.transaction(async (tx) => {
      // Delete all folder tasks and events
      await tx
        .delete(tasksTable)
        .where(
          eq(
            sql<string>`(${tasksTable.targetLocation} ->> 'folderId')::uuid`,
            folderId,
          ),
        )
      await tx
        .delete(eventsTable)
        .where(
          eq(
            sql<string>`(${eventsTable.targetLocation} ->> 'folderId')::uuid`,
            folderId,
          ),
        )
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
      throw new FolderOperationForbiddenException()
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
      throw new FolderOperationForbiddenException()
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
      cursor,
      offset = 0,
      limit = 25,
      sort = [FolderObjectSort.CreatedAtAsc],
      includeImage,
      includeVideo,
      includeAudio,
      includeDocument,
      includeUnknown,
    }: {
      folderId: string
      search?: string
      cursor?: string
      offset?: number
      limit?: number
      sort?: FolderObjectSort[]
      includeImage?: string
      includeVideo?: string
      includeAudio?: string
      includeDocument?: string
      includeUnknown?: string
    },
  ) {
    const { folder } = await this.getFolderAsUser(actor, folderId)

    const conditions: (SQL | undefined)[] = [
      eq(folderObjectsTable.folderId, folder.id),
    ]

    if (search) {
      conditions.push(ilike(folderObjectsTable.objectKey, `%${search}%`))
    }

    // Add mediaType filters
    const mediaTypeFilters: MediaType[] = []
    if (includeImage) {
      mediaTypeFilters.push(MediaType.Image)
    }
    if (includeVideo) {
      mediaTypeFilters.push(MediaType.Video)
    }
    if (includeAudio) {
      mediaTypeFilters.push(MediaType.Audio)
    }
    if (includeDocument) {
      mediaTypeFilters.push(MediaType.Document)
    }
    if (includeUnknown) {
      mediaTypeFilters.push(MediaType.Unknown)
    }

    if (mediaTypeFilters.length > 0) {
      conditions.push(inArray(folderObjectsTable.mediaType, mediaTypeFilters))
    }

    const where = and(...conditions.filter(Boolean))

    // Build keyset pagination when cursor is provided
    const orderSorts = [...sort]
    // Always add id as final tiebreaker
    const hasIdSort = orderSorts.some((s) => s.startsWith('id-'))
    if (!hasIdSort) {
      orderSorts.push('id-asc' as unknown as FolderObjectSort)
    }

    let keysetWhere: SQL | undefined
    let isNextDirection = true // Default to next direction for backward compatibility
    if (cursor) {
      try {
        const decoded = JSON.parse(
          Buffer.from(cursor, 'base64').toString('utf8'),
        ) as {
          lastId: string
          keys?: Record<string, unknown>
          direction?: 'next' | 'previous'
        }

        isNextDirection = decoded.direction !== 'previous'

        const colMap: Record<string, PgColumn> = {
          sizeBytes: folderObjectsTable.sizeBytes,
          filename: folderObjectsTable.filename,
          objectKey: folderObjectsTable.objectKey,
          createdAt: folderObjectsTable.createdAt,
          updatedAt: folderObjectsTable.updatedAt,
          id: folderObjectsTable.id,
        }

        // Build lexicographic keyset using all sort columns then id asc
        const sortCols = orderSorts.filter((s) => !String(s).startsWith('id-'))

        // Prepare a chain like (c1>v1) OR (c1=v1 AND c2>v2) ... OR (c1=v1 AND ... AND id>lastId)
        let condition: SQL | undefined
        for (let i = sortCols.length - 1; i >= 0; i--) {
          const [colName, dir] = String(sortCols[i]).split('-') as [
            string,
            'asc' | 'desc',
          ]
          const column = colMap[colName]
          const rawValue = decoded.keys?.[colName]
          if (!(colName in colMap) || rawValue === undefined) {
            continue
          }
          // Coerce to correct type for drizzle
          let typedValue: unknown = rawValue
          if (colName === 'createdAt' || colName === 'updatedAt') {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            typedValue = new Date(String(rawValue))
          } else if (colName === 'sizeBytes') {
            typedValue =
              typeof rawValue === 'number' ? rawValue : Number(rawValue)
          } else if (colName === 'objectKey' || colName === 'id') {
            // eslint-disable-next-line @typescript-eslint/no-base-to-string
            typedValue = String(rawValue)
          }
          // Determine comparison direction based on cursor direction
          isNextDirection = decoded.direction !== 'previous'
          const cmp =
            (dir === 'asc' && isNextDirection) ||
            (dir === 'desc' && !isNextDirection)
              ? gt(column, typedValue as never)
              : lt(column, typedValue as never)

          if (!condition) {
            // base case compares id when all previous equal
            condition = or(
              cmp,
              and(
                eq(column, typedValue as never),
                isNextDirection
                  ? gt(folderObjectsTable.id, decoded.lastId)
                  : lt(folderObjectsTable.id, decoded.lastId),
              ),
            )
          } else {
            condition = or(cmp, and(eq(column, typedValue as never), condition))
          }
        }
        keysetWhere =
          condition ??
          (isNextDirection
            ? gt(folderObjectsTable.id, decoded.lastId)
            : lt(folderObjectsTable.id, decoded.lastId))
      } catch {
        // Invalid cursor - ignore and treat as first page
        // no-op
      }
    }

    // For "previous" direction queries, flip the ORDER BY so we fetch the
    // prior items efficiently, then reverse back to ascending for the response
    const orderSortsForQuery = isNextDirection
      ? orderSorts
      : orderSorts.map((s) => {
          const [col, dir] = String(s).split('-') as [string, 'asc' | 'desc']
          const flipped = dir === 'asc' ? 'desc' : 'asc'
          return `${col}-${flipped}` as unknown as FolderObjectSort
        })
    const orderBy = parseSort(folderObjectsTable, orderSortsForQuery)

    const folderObjects =
      await this.ormService.db.query.folderObjectsTable.findMany({
        where: keysetWhere ? and(where, keysetWhere) : where,
        offset: cursor ? undefined : offset,
        // Always fetch one extra to determine if there is a next page
        limit: limit + 1,
        orderBy,
      })
    const [folderObjectsCount] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(folderObjectsTable)
      .where(where)

    let nextCursor: string | undefined
    let previousCursor: string | undefined

    // Normalize results to ascending order for response shape
    const normalized = isNextDirection
      ? folderObjects
      : [...folderObjects].reverse()
    // Slice to page size; if we got more than limit, there is a next page
    const page = normalized.slice(0, limit)
    if (folderObjects.length > limit) {
      const last = page[page.length - 1]
      const keys: Record<string, unknown> = {}
      const lastAny = last as Record<string, unknown>
      for (const s of orderSorts) {
        const [colName] = String(s).split('-')
        if (colName === 'id') {
          continue
        }
        const v = lastAny[colName]
        if (v instanceof Date) {
          keys[colName] = v.toISOString()
        } else if (typeof v === 'string' || typeof v === 'number') {
          keys[colName] = v
        }
      }
      nextCursor = Buffer.from(
        JSON.stringify({ lastId: last.id, keys, direction: 'next' }),
      ).toString('base64')
    }

    // Check if there's a previous page by looking for items before the first item
    if (page.length > 0) {
      const first = page[0]
      const firstKeys: Record<string, unknown> = {}
      const firstAny = first as Record<string, unknown>
      for (const s of orderSorts) {
        const [colName] = String(s).split('-')
        if (colName === 'id') {
          continue
        }
        const v = firstAny[colName]
        if (v instanceof Date) {
          firstKeys[colName] = v.toISOString()
        } else if (typeof v === 'string' || typeof v === 'number') {
          firstKeys[colName] = v
        }
      }

      // Count items that would come before this page
      const previousCount = await this.ormService.db
        .select({ count: sql<string>`count(*)` })
        .from(folderObjectsTable)
        .where(
          and(
            where,
            or(
              // Items that sort before the first item in current page
              ...orderSorts
                .filter((s) => !String(s).startsWith('id-'))
                .map((s, i) => {
                  const [colName, dir] = String(s).split('-') as [
                    string,
                    'asc' | 'desc',
                  ]
                  const column = {
                    sizeBytes: folderObjectsTable.sizeBytes,
                    filename: folderObjectsTable.filename,
                    objectKey: folderObjectsTable.objectKey,
                    createdAt: folderObjectsTable.createdAt,
                    updatedAt: folderObjectsTable.updatedAt,
                  }[colName]

                  if (!column) {
                    return undefined
                  }

                  const firstValue = firstAny[colName]
                  const comparison =
                    dir === 'asc'
                      ? lt(column, firstValue as never)
                      : gt(column, firstValue as never)

                  if (i === 0) {
                    return comparison
                  } else {
                    // For subsequent columns, need to match previous columns first
                    const prevConditions = orderSorts
                      .slice(0, i)
                      .map((prevS) => {
                        const [prevColName] = String(prevS).split('-')
                        const prevColumn = {
                          sizeBytes: folderObjectsTable.sizeBytes,
                          filename: folderObjectsTable.filename,
                          objectKey: folderObjectsTable.objectKey,
                          createdAt: folderObjectsTable.createdAt,
                          updatedAt: folderObjectsTable.updatedAt,
                        }[prevColName]

                        if (!prevColumn) {
                          return undefined
                        }
                        return eq(prevColumn, firstAny[prevColName] as never)
                      })
                      .filter(Boolean)

                    return and(comparison, ...prevConditions)
                  }
                })
                .filter(Boolean),
              // Also include items that match all sort columns but have smaller id
              and(
                ...orderSorts
                  .filter((s) => !String(s).startsWith('id-'))
                  .map((s) => {
                    const [colName] = String(s).split('-')
                    const column = {
                      sizeBytes: folderObjectsTable.sizeBytes,
                      filename: folderObjectsTable.filename,
                      objectKey: folderObjectsTable.objectKey,
                      createdAt: folderObjectsTable.createdAt,
                      updatedAt: folderObjectsTable.updatedAt,
                    }[colName]

                    if (!column) {
                      return undefined
                    }
                    return eq(column, firstAny[colName] as never)
                  })
                  .filter(Boolean),
                lt(folderObjectsTable.id, first.id),
              ),
            ),
          ),
        )

      if (parseInt(previousCount[0]?.count ?? '0', 10) > 0) {
        previousCursor = Buffer.from(
          JSON.stringify({
            lastId: first.id,
            keys: firstKeys,
            direction: 'previous',
          }),
        ).toString('base64')
      }
    }

    return {
      result: page,
      meta: {
        totalCount: parseInt(folderObjectsCount.count ?? '0', 10),
        nextCursor,
        previousCursor,
      },
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
            throw new FolderOperationForbiddenException()
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

  async queueReindexFolder(folderId: string, userId: string) {
    await this.taskService.triggerPlatformUserActionTask({
      taskIdentifier: PlatformTaskName.ReindexFolder,
      taskData: { folderId },
      targetLocation: { folderId },
      userId,
    })
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
      throw new FolderOperationForbiddenException()
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
        if (objectKey.startsWith('.lombok_')) {
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

    const headResponse = await this.s3Service.s3HeadObject({
      endpoint: contentStorageLocation.endpoint,
      region: contentStorageLocation.region,
      accessKeyId: contentStorageLocation.accessKeyId,
      secretAccessKey: contentStorageLocation.secretAccessKey,
      bucket: contentStorageLocation.bucket,
      objectKey: absoluteObjectKey,
    })
    if (eTag && headResponse.eTag !== eTag) {
      throw new NotFoundException(`Object ${objectKey} eTag mismatch.`)
    }
    return this.updateFolderObjectInDB(folderId, objectKey, {
      ...headResponse,
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

    const mimeTypeFromExtension = extension
      ? (mimeFromExtension(extension) ?? '')
      : ''
    const insertMimeType = updateRecord.mimeType ?? mimeTypeFromExtension
    const insertMediaType = updateRecord.mimeType
      ? mediaTypeFromMimeType(updateRecord.mimeType)
      : extension
        ? mediaTypeFromMimeType(mimeTypeFromExtension)
        : MediaType.Unknown

    const insertValues = {
      id: uuidV4(),
      folderId,
      objectKey,
      filename: objectKey.split('/').pop() ?? objectKey,
      lastModified: updateRecord.lastModified ?? 0,
      hash: undefined,
      eTag: updateRecord.eTag ?? '',
      contentMetadata: {},
      sizeBytes: updateRecord.size ?? 0,
      mediaType: insertMediaType,
      mimeType: insertMimeType,
      createdAt: now,
      updatedAt: now,
    }

    const updateSet = {
      sizeBytes: insertValues.sizeBytes,
      lastModified: insertValues.lastModified,
      eTag: insertValues.eTag,
      updatedAt: now,
    } as const

    if (updateRecord.mimeType) {
      Object.assign(updateSet, {
        mimeType: insertValues.mimeType,
        mediaType: insertValues.mediaType,
      })
    }

    const record = (
      await this.ormService.db
        .insert(folderObjectsTable)
        .values(insertValues)
        .onConflictDoUpdate({
          target: [folderObjectsTable.folderId, folderObjectsTable.objectKey],
          set: updateSet,
        })
        .returning()
    )[0]

    // Decide event type based on createdAt vs updatedAt: insert sets both to now, update changes only updatedAt
    const wasAdded = record.createdAt.getTime() === record.updatedAt.getTime()

    this.folderSocketService.sendToFolderRoom(
      folderId,
      wasAdded
        ? FolderPushMessage.OBJECT_ADDED
        : FolderPushMessage.OBJECT_UPDATED,
      { folderObject: record },
    )

    await this.eventService.emitEvent({
      emitterIdentifier: PLATFORM_IDENTIFIER,
      eventIdentifier: wasAdded
        ? PlatformEvent.object_added
        : PlatformEvent.object_updated,
      targetLocation: {
        folderId: record.folderId,
        objectKey: record.objectKey,
      },
      data: {
        ...record,
        contentMetadata: record.contentMetadata as JsonSerializableObject,
        createdAt: record.createdAt.toISOString(),
        updatedAt: record.updatedAt.toISOString(),
      },
    })

    return record
  }

  async updateFolderObjectMetadata(
    appIdentifier: string,
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
      // Function to merge new previews with existing ones
      function updatePreviews(): InlineMetadataEntry {
        const existingPreviews = JSON.parse(
          folderObject?.contentMetadata[hash]?.previews?.type === 'inline'
            ? folderObject.contentMetadata[hash].previews.content
            : '{}',
        ) as Record<string, PreviewMetadata>

        const incomingPreviews =
          metadata.previews?.type === 'inline'
            ? (JSON.parse(metadata.previews.content) as unknown)
            : {}
        if (
          safeZodParse(
            incomingPreviews,
            z.record(z.string(), previewMetadataSchema),
          )
        ) {
          const stringifiedPreviews = JSON.stringify({
            ...existingPreviews,
            ...Object.keys(incomingPreviews).reduce(
              (acc, incomingPreviewVariant) => ({
                ...acc,
                [`${appIdentifier}:${incomingPreviewVariant}`]:
                  incomingPreviews[incomingPreviewVariant],
              }),
              {},
            ),
          })
          return {
            type: 'inline',
            sizeBytes: Buffer.from(stringifiedPreviews).length,
            mimeType: 'application/json',
            content: stringifiedPreviews,
          }
        }
        throw new BadRequestException(
          'Invalid previews. Expected a record of string keys and preview metadata.',
        )
      }
      const hasIncomingPreviews = 'previews' in metadata
      const updates = {
        hash,
        contentMetadata: {
          ...folderObject.contentMetadata,
          [hash]: {
            ...folderObject.contentMetadata[hash],
            ...metadata,
            ...(hasIncomingPreviews ? { previews: updatePreviews() } : {}),
          },
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
  }
}
