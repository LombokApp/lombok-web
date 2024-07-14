import { InjectQueue } from '@nestjs/bullmq'
import type { OnModuleInit } from '@nestjs/common'
import {
  BadRequestException,
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type {
  ContentAttributesType,
  ContentMetadataType,
  FolderPermissionName,
  S3ObjectInternal,
} from '@stellariscloud/types'
import {
  FolderPermissionEnum,
  FolderPushMessage,
  MediaType,
  SignedURLsRequestMethod,
} from '@stellariscloud/types'
import {
  mediaTypeFromExtension,
  objectIdentifierToObjectKey,
} from '@stellariscloud/utils'
import { Queue } from 'bullmq'
import { and, eq, like, sql } from 'drizzle-orm'
import mime from 'mime'
import * as r from 'runtypes'
import { parseSort } from 'src/core/utils/sort.util'
import { EventService } from 'src/event/services/event.service'
import type { Location } from 'src/locations/entities/locations.entity'
import { locationsTable } from 'src/locations/entities/locations.entity'
import { LocationNotFoundException } from 'src/locations/exceptions/location-not-found.exceptions'
import type { UserLocationInputDTO } from 'src/locations/transfer-objects/user-location-input.dto'
import { OrmService } from 'src/orm/orm.service'
import { QueueName } from 'src/queue/queue.constants'
import { configureS3Client, S3Service } from 'src/s3/s3.service'
import { createS3PresignedUrls } from 'src/s3/s3.utils'
import { ServerLocationType } from 'src/server/constants/server.constants'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { SocketService } from 'src/socket/socket.service'
import type { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

import type { FolderObjectDTO } from '../dto/folder-object.dto'
import type { Folder } from '../entities/folder.entity'
import { foldersTable } from '../entities/folder.entity'
import type { FolderObject } from '../entities/folder-object.entity'
import { folderObjectsTable } from '../entities/folder-object.entity'
import { FolderMetadataWriteUnauthorisedException } from '../exceptions/folder-metadata-write-unauthorized.exception'
import { FolderNotFoundException } from '../exceptions/folder-not-found.exception'
import { FolderObjectNotFoundException } from '../exceptions/folder-object-not-found.exception'
import { FolderPermissionUnauthorizedException } from '../exceptions/folder-permission-unauthorized.exception'

export interface OutputUploadUrlsResponse {
  folderId: string
  objectKey: string
  url: string
}

export interface ContentAttibutesPayload {
  folderId: string
  objectKey: string
  hash: string
  attributes: ContentAttributesType
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
  FolderPermissionEnum.FOLDER_FORGET,
  FolderPermissionEnum.FOLDER_RESCAN,
  FolderPermissionEnum.OBJECT_EDIT,
  FolderPermissionEnum.OBJECT_MANAGE,
]

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

@Injectable()
export class FolderService implements OnModuleInit {
  eventService: EventService
  constructor(
    private readonly socketService: SocketService,
    private readonly s3Service: S3Service,
    @Inject(forwardRef(() => EventService))
    _eventService,
    private readonly ormService: OrmService,
    private readonly serverConfigurationService: ServerConfigurationService,
    @InjectQueue(QueueName.RescanFolder)
    private readonly rescanFolderQueue: Queue<
      { folderId: string; userId: string },
      void,
      QueueName.RescanFolder
    >,
  ) {
    this.eventService = _eventService
  }

  onModuleInit() {
    // this.socketService = this.moduleRef.get(SocketService)
    // this.eventService = this.moduleRef.get(EventService)
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
      contentLocation: UserLocationInputDTO
      metadataLocation?: UserLocationInputDTO
    }
    userId: string
  }): Promise<Folder> {
    // create the ID ahead of time so we can also include
    // it in the prefix of the folders data location
    // (in the case of a Server provided location for a user folder)
    const prospectiveFolderId = uuidV4()
    const metadataPrefix = `.stellaris_folder_metadata_${prospectiveFolderId}`

    const now = new Date()
    const buildLocation = async (
      serverLocationType: ServerLocationType,
      locationInput: UserLocationInputDTO,
    ): Promise<Location> => {
      const withNewUserLocationConnection =
        NewUserLocationPayloadRunType.validate(locationInput)
      const withExistingUserLocation =
        ExistingUserLocationPayloadRunType.validate(locationInput)
      const withExistingServerLocation =
        ServerLocationPayloadRunType.validate(locationInput)

      let location: Location | undefined = undefined

      if (withNewUserLocationConnection.success) {
        // user has input all new location info
        location = (
          await this.ormService.db
            .insert(locationsTable)
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
          await this.ormService.db.query.locationsTable.findFirst({
            where: and(
              eq(locationsTable.providerType, 'USER'),
              eq(locationsTable.userId, userId),
              eq(
                locationsTable.id,
                withExistingUserLocation.value.userLocationId,
              ),
            ),
          })
        if (existingLocation) {
          location = (
            await this.ormService.db
              .insert(locationsTable)
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
          throw new LocationNotFoundException()
        }
      } else if (withExistingServerLocation.success) {
        // user has provided a server location reference
        const existingServerLocation =
          await this.serverConfigurationService.getConfiguredServerLocationById(
            serverLocationType,
            withExistingServerLocation.value.serverLocationId,
          )

        if (!existingServerLocation) {
          throw new LocationNotFoundException()
        }

        location = (
          await this.ormService.db
            .insert(locationsTable)
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
        throw new BadRequestException()
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
            .insert(locationsTable)
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
    //   .insert(locationsTable)
    //   .values(contentLocation)

    // await this.ormService.db
    //   .insert(locationsTable)
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

  async deleteFolderAsUser({
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

    if (!permissions.includes(FolderPermissionEnum.FOLDER_FORGET)) {
      throw new FolderPermissionUnauthorizedException()
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
    const { folder, permissions } = await this.getFolderAsUser({
      folderId,
      userId,
    })

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

    this.socketService.sendToFolderRoom(
      folderId,
      FolderPushMessage.OBJECT_REMOVED,
      { folderObject },
    )

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
      throw new FolderObjectNotFoundException()
    }
    return obj
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
      throw new FolderNotFoundException()
    }

    return {
      folder,
      permissions: OWNER_PERMISSIONS,
      // ? OWNER_PERMISSIONS
      // : share?.shareConfiguration.permissions ?? [],
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

  async createPresignedUrlsAsUser({
    userId,
    folderId,
    urls,
  }: {
    userId: string
    folderId: string
    urls: SignedURLsRequest[]
  }): Promise<string[]> {
    const { folder, permissions } = await this.getFolderAsUser({
      folderId,
      userId,
    })

    return createS3PresignedUrls(
      urls.map((urlRequest) => {
        // objectIdentifier looks like one of these, depending on if it's a regular object content request or an object metadata request
        // `metadata:${objectKey}:${metadataObject.hash}`
        // `content:${objectKey}`
        if (
          !urlRequest.objectIdentifier.startsWith('content:') &&
          !urlRequest.objectIdentifier.startsWith('metadata:')
        ) {
          throw new FolderObjectNotFoundException()
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
          throw new FolderObjectNotFoundException()
        }

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
          [
            SignedURLsRequestMethod.DELETE,
            SignedURLsRequestMethod.PUT,
          ].includes(urlRequest.method) &&
          isMetadataIdentifier
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
          objectKey: objectKeyToFetch,
          expirySeconds: 3600,
        }
      }),
    )
  }

  queueRescanFolder(folderId: string, userId: string) {
    return this.rescanFolderQueue.add(
      QueueName.RescanFolder,
      { folderId, userId },
      { jobId: uuidV4() },
    )
  }

  async rescanFolder(folderId: string, userId: string) {
    // console.log('rescanFolder:', { folderId, userId })
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
    if (!permissions.includes(FolderPermissionEnum.FOLDER_RESCAN)) {
      throw new FolderPermissionUnauthorizedException()
    }

    // delete all objects related to this folder
    await this.ormService.db
      .delete(folderObjectsTable)
      .where(eq(folderObjectsTable.folderId, folder.id))
    // TODO: implement folder object refreshing from bucket

    // consume the objects in the bucket, 1000 at a time, turning them into FolderObject entities
    let _contentCount = 0
    let _metadataCount = 0
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
          _metadataCount++
        } else if (obj.size > 0) {
          _contentCount++
          // this is a user file
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

  async refreshFolderObjectS3MetadataAsUser({
    userId,
    folderId,
    objectKey,
    eTag,
  }: {
    userId: string
    folderId: string
    objectKey: string
    eTag?: string
  }): Promise<FolderObjectDTO> {
    const { folder } = await this.getFolderAsUser({ folderId, userId })

    const contentStorageLocation =
      await this.ormService.db.query.locationsTable.findFirst({
        where: eq(locationsTable.id, folder.contentLocationId),
      })

    if (!contentStorageLocation) {
      throw new NotFoundException(
        `Storage location not found by id "${folder.contentLocationId}"`,
      )
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
    return this.updateFolderObjectInDB(folderId, objectKey, response)
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
        ? FolderPushMessage.OBJECT_UPDATED
        : FolderPushMessage.OBJECT_ADDED,
      { folderObject: record },
    )

    await this.eventService.emitEvent({
      appIdentifier: 'core',
      eventKey: previousRecord ? 'CORE:OBJECT_UPDATED' : 'CORE:OBJECT_ADDED',
      data: record,
    })

    return record
  }

  async updateFolderObjectAttributes(
    payload: ContentAttibutesPayload[],
  ): Promise<void> {
    for (const { folderId, objectKey, hash, attributes } of payload) {
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

      const updatedObject = (
        await this.ormService.db
          .update(folderObjectsTable)
          .set({
            hash,
            contentAttributes: {
              ...folderObject.contentAttributes,
              [hash]: {
                ...folderObject.contentAttributes[hash],
                ...attributes,
              },
            },
          })
          .where(
            and(
              eq(folderObjectsTable.folderId, folderId),
              eq(folderObjectsTable.objectKey, objectKey),
            ),
          )
          .returning()
      )[0]
      this.socketService.sendToFolderRoom(
        folderId,
        FolderPushMessage.OBJECTS_UPDATED,
        updatedObject,
      )
    }
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

      this.socketService.sendToFolderRoom(
        folderId,
        FolderPushMessage.OBJECT_UPDATED,
        updatedObject,
      )
    }
  }
}
