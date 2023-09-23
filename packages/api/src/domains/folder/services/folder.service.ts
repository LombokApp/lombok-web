import type { S3ObjectInternal } from '@stellariscloud/types'
import { FolderPushMessage, MediaType } from '@stellariscloud/types'
import {
  mediaTypeFromExtension,
  objectIdentifierToObjectKey,
  parseSort,
} from '@stellariscloud/utils'
import { FolderOperationName } from '@stellariscloud/workers'
import mime from 'mime'
import { Lifecycle, scoped } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'
import type { Logger } from 'winston'

import type { MetadataLocationConfig } from '../../../config/config.interface'
import { EnvConfigProvider } from '../../../config/env-config.provider'
import type { FolderOperationRequestPayload } from '../../../controllers/folders.controller'
import { LoggingService } from '../../../services/logging.service'
import { QueueService } from '../../../services/queue.service'
import { configureS3Client, S3Service } from '../../../services/s3.service'
import { SocketService } from '../../../services/socket.service'
import { JWTService } from '../../auth/services/jwt.service'
import { FolderOperationService } from '../../folder-operation/services/folder-operation.service'
import { UserService } from '../../user/services/user.service'
import type { Folder } from '../entities/folder.entity'
import { FolderRepository } from '../entities/folder.repository'
import type { FolderObject } from '../entities/folder-object.entity'
import { FolderObjectRepository } from '../entities/folder-object.repository'
import type { FolderShare } from '../entities/folder-share.entity'
import { FolderShareRepository } from '../entities/folder-share.repository'
import type { ObjectTag } from '../entities/object-tag.entity'
import { ObjectTagRepository } from '../entities/object-tag.repository'
import { ObjectTagRelationRepository } from '../entities/object-tag-relation.repository'
import { S3ConnectionRepository } from '../entities/s3-connection.repository'
import {
  FolderMetadataWriteNotAuthorised,
  FolderNotFoundError,
  FolderObjectNotFoundError,
  FolderPermissionInvalidError,
  FolderPermissionMissingError,
  FolderShareNotFoundError,
  FolderTagNotFoundError,
  ObjectTagInvalidError,
} from '../errors/folder.error'
import { S3ConnectionNotFoundError } from '../errors/s3-connection.error'
import type { CreateFolderSharePayload } from '../transfer-objects/folder-share.dto'

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

@scoped(Lifecycle.ContainerScoped)
export class FolderService {
  private readonly logger: Logger
  private readonly metadataLocationConfig: MetadataLocationConfig =
    this.configProvider.getMetadataLocationConfig()

  constructor(
    private readonly queueService: QueueService,
    private readonly objectTagRepository: ObjectTagRepository,
    private readonly objectTagRelationRepository: ObjectTagRelationRepository,
    private readonly folderObjectRepository: FolderObjectRepository,
    private readonly folderOperationService: FolderOperationService,
    private readonly folderShareRepository: FolderShareRepository,
    private readonly folderRepository: FolderRepository,
    private readonly jwtService: JWTService,
    private readonly socketService: SocketService,
    private readonly userService: UserService,
    private readonly s3ConnectionRepository: S3ConnectionRepository,
    private readonly loggingService: LoggingService,
    private readonly s3Service: S3Service,
    private readonly configProvider: EnvConfigProvider,
  ) {
    this.logger = this.loggingService.logger
  }

  async createFolder({
    userId,
    body,
  }: {
    body: {
      name: string
      bucket: string
      prefix?: string
      s3ConnectionId: string
    }
    userId: string
  }): Promise<Folder> {
    const s3Connection = await this.s3ConnectionRepository.findOne({
      id: body.s3ConnectionId,
      owner: userId,
    })

    if (!s3Connection) {
      throw new S3ConnectionNotFoundError()
    }

    const folder = this.folderRepository.create({
      name: body.name,
      bucket: body.bucket,
      prefix: body.prefix,
      accessKeyId: s3Connection.accessKeyId,
      secretAccessKey: s3Connection.secretAccessKey,
      region: s3Connection.region,
      endpoint: s3Connection.endpoint,
      metadataEndpoint: this.metadataLocationConfig.s3Endpoint,
      metadataBucket: this.metadataLocationConfig.s3Bucket,
      metadataSecretAccessKey: '',
      metadataAccessKeyId: '',
      owner: userId,
    })
    await this.folderRepository.getEntityManager().flush()
    return folder
  }

  async getFolder({ folderId }: { folderId: string }) {
    const folder = await this.folderRepository.findOne({
      id: folderId,
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
    const [folders, foldersCount] = await this.folderRepository.findAndCount(
      {
        $or: [{ owner: userId }, { shares: { user: userId } }],
      },
      { offset: offset ?? 0, limit: limit ?? 25 },
    )

    return {
      result: folders.map((folder) => ({ folder, permissions: [] })),
      meta: { totalCount: foldersCount },
    }
  }

  async deleteFolder({
    userId,
    folderId,
  }: {
    userId: string
    folderId: string
  }): Promise<boolean> {
    const { folder, permissions } = await this.getFolderAsUser({
      folderId,
      userId,
    })

    if (!permissions.includes(FolderPermissionName.FOLDER_FORGET)) {
      throw new FolderPermissionMissingError()
    }

    this.folderRepository.getEntityManager().remove(folder)
    await this.folderRepository.getEntityManager().flush()
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

    if (!permissions.includes(FolderPermissionName.OBJECT_EDIT)) {
      throw new FolderPermissionMissingError()
    }

    const obj = await this.folderObjectRepository.findOne({
      folder: folderId,
      objectKey,
    })

    if (!obj) {
      throw new FolderObjectNotFoundError()
    }

    await this.s3Service.s3DeleteBucketObject({
      accessKeyId: folder.accessKeyId,
      secretAccessKey: folder.secretAccessKey,
      endpoint: folder.endpoint,
      region: folder.region,
      bucket: folder.bucket,
      objectKey,
    })

    this.folderRepository.getEntityManager().remove(obj)
    await this.folderRepository.getEntityManager().flush()
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
    const folderMetadata = await this.folderRepository.getFolderMetadata(
      folderId,
    )
    return folderMetadata
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
    const obj = await this.folderObjectRepository.findOne(
      {
        folder: folderId,
        objectKey,
      },
      {
        populate: ['tags'],
      },
    )
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
  }) {
    // TODO: get user specific sharing config if user is not the owner
    const folder = await this.folderRepository.findOne(
      {
        id: folderId,
        $or: [{ owner: userId }, { shares: { user: userId } }],
      },
      { populate: ['shares'] },
    )
    const isOwner = folder?.owner?.id === userId
    const share = folder?.shares.getItems()?.find((s) => s.user?.id === userId)

    if (!folder || (!isOwner && !share)) {
      throw new FolderNotFoundError()
    }

    return {
      folder,
      permissions: isOwner
        ? OWNER_PERMISSIONS
        : share?.shareConfiguration.permissions ?? [],
    }
  }

  async listFolderObjects({
    userId,
    folderId,
    search,
    tagId,
    offset,
    limit,
    sort = FolderObjectSort.CreatedAtAsc,
  }: {
    userId: string
    folderId: string
    search?: string
    tagId?: string
    offset?: number
    limit?: number
    sort?: FolderObjectSort
  }) {
    const _folder = await this.getFolderAsUser({ folderId, userId })
    const [folderObjects, folderObjectsCount] =
      await this.folderObjectRepository.findAndCount(
        {
          folder: folderId,
          ...(search ? { objectKey: { $like: `%${search}%` } } : {}),
          ...(tagId ? { tags: { tag: tagId } } : {}),
        },
        {
          offset: offset ?? 0,
          limit: limit ?? 25,
          orderBy: { ...parseSort(sort), id: 'ASC' },
        },
      )

    return {
      result: folderObjects,
      meta: { totalCount: folderObjectsCount },
    }
  }

  async getFolderShareAsUser({
    userId,
    folderId,
    shareId,
  }: {
    userId: string
    folderId: string
    shareId: string
  }) {
    const _folder = await this.getFolderAsUser({ userId, folderId })
    const share = await this.folderShareRepository.findOne({
      id: shareId,
      folder: folderId,
    })

    if (!share) {
      throw new FolderShareNotFoundError()
    }
    return share
  }

  async listFolderShares({
    userId,
    folderId,
    offset,
    limit,
  }: {
    userId: string
    folderId: string
    offset?: number
    limit?: number
  }) {
    const _folder = await this.getFolderAsUser({ userId, folderId })
    const [folderShares, folderSharesCount] =
      await this.folderShareRepository.findAndCount(
        {
          folder: folderId,
        },
        { offset: offset ?? 0, limit: limit ?? 25 },
      )

    return {
      result: folderShares,
      meta: { totalCount: folderSharesCount },
    }
  }

  async createFolderShareAsUser({
    userId,
    folderId,
    share,
  }: {
    userId: string
    folderId: string
    share: CreateFolderSharePayload
  }): Promise<FolderShare> {
    const _folder = await this.getFolderAsUser({ folderId, userId })

    let sharedUserId: string | undefined = undefined
    try {
      sharedUserId = await this.userService
        .getByEmail({
          email: share.userInviteEmail,
        })
        .then((u) => u.id)
    } catch (e) {
      // pass
    }

    const folderShare = this.folderShareRepository.create({
      folder: folderId,
      shareConfiguration: share.shareConfiguration,
      userInviteEmail: share.userInviteEmail,
      userLabel: share.userInviteEmail,
      user: sharedUserId,
    })
    await this.folderRepository.getEntityManager().flush()
    return folderShare
  }

  async updateFolderShareAsUser({
    userId,
    folderId,
    shareId,
    shareConfiguration,
  }: {
    userId: string
    folderId: string
    shareId: string
    shareConfiguration: CreateFolderSharePayload['shareConfiguration']
  }) {
    const permissionValues = Object.values(FolderPermissionName)
    const _folder = await this.getFolderAsUser({ folderId, userId })
    const share = await this.getFolderShareAsUser({ userId, folderId, shareId })
    shareConfiguration.permissions.forEach((p) => {
      if (!permissionValues.includes(p)) {
        throw new FolderPermissionInvalidError()
      }
    })
    share.shareConfiguration = shareConfiguration
    await this.folderRepository.getEntityManager().flush()
    return share
  }

  async deleteFolderShareAsUser({
    userId,
    folderId,
    shareId,
  }: {
    userId: string
    folderId: string
    shareId: string
  }): Promise<boolean> {
    const folder = await this.folderRepository.findOne({
      id: folderId,
      owner: userId,
    })

    if (!folder) {
      throw new FolderNotFoundError()
    }

    const folderShare = await this.folderShareRepository.findOne({
      id: shareId,
      folder: folderId,
    })
    if (!folderShare) {
      throw new FolderShareNotFoundError()
    }
    this.folderRepository.getEntityManager().remove(folderShare)
    await this.folderRepository.getEntityManager().flush()
    return true
  }

  async listTags({
    // userId,
    folderId,
    offset,
    limit,
  }: {
    userId: string
    folderId: string
    offset?: number
    limit?: number
  }) {
    const [objectTags, objectTagsCount] =
      await this.objectTagRepository.findAndCount(
        {
          folder: folderId,
        },
        { offset: offset ?? 0, limit: limit ?? 25 },
      )

    return {
      result: objectTags,
      meta: { totalCount: objectTagsCount },
    }
  }

  async createTag({
    userId,
    folderId,
    body,
  }: {
    body: { name: string }
    userId: string
    folderId: string
  }): Promise<ObjectTag> {
    const { permissions } = await this.getFolderAsUser({ folderId, userId })
    if (!permissions.includes(FolderPermissionName.TAG_CREATE)) {
      throw new FolderPermissionMissingError()
    }
    const objectTag = this.objectTagRepository.create({
      folder: folderId,
      name: body.name,
    })
    await this.objectTagRepository.getEntityManager().flush()
    return objectTag
  }

  async updateTag({
    userId,
    tagId,
    folderId,
    body,
  }: {
    body: { name: string }
    userId: string
    tagId: string
    folderId: string
  }) {
    const { permissions } = await this.getFolderAsUser({ folderId, userId })
    if (!permissions.includes(FolderPermissionName.TAG_CREATE)) {
      throw new FolderPermissionMissingError()
    }
    const objectTag = await this.objectTagRepository.findOne({
      id: tagId,
      folder: folderId,
    })

    if (!objectTag) {
      throw new FolderTagNotFoundError()
    }

    if (!body.name || body.name.length <= 0) {
      throw new FolderTagNotFoundError()
    }

    objectTag.name = body.name
    await this.objectTagRepository.getEntityManager().flush()
    return objectTag
  }

  async deleteTag({
    userId,
    folderId,
    tagId,
  }: {
    userId: string
    folderId: string
    tagId: string
  }): Promise<boolean> {
    const { permissions } = await this.getFolderAsUser({ folderId, userId })

    if (!permissions.includes(FolderPermissionName.OBJECT_EDIT)) {
      throw new FolderPermissionMissingError()
    }

    const tag = await this.objectTagRepository.findOne({
      id: tagId,
      folder: folderId,
    })

    if (!tag) {
      throw new FolderObjectNotFoundError()
    }

    this.folderRepository.getEntityManager().remove(tag)
    await this.folderRepository.getEntityManager().flush()
    return true
  }

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
  ) {
    const { folder, permissions } = await this.getFolderAsUser({
      folderId,
      userId,
    })

    const metadataBucketConfig =
      folder.metadataEndpoint === this.metadataLocationConfig.s3Endpoint &&
      folder.metadataBucket === this.metadataLocationConfig.s3Bucket
        ? {
            accessKeyId: this.metadataLocationConfig.s3AccessKeyId,
            secretAccessKey: this.metadataLocationConfig.s3SecretAccessKey,
            endpoint: this.metadataLocationConfig.s3Endpoint,
            region: this.metadataLocationConfig.s3Region,
            bucket: this.metadataLocationConfig.s3Bucket,
          }
        : {
            accessKeyId: folder.metadataAccessKeyId,
            secretAccessKey: folder.metadataSecretAccessKey,
            endpoint: folder.metadataEndpoint,
            region: folder.metadataRegion,
            prefix: folder.metadataPrefix,
            bucket: folder.bucket,
          }

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
              folder.metadataPrefix ? folder.metadataPrefix : ''
            }${folderId}/${metadataObjectKey}`
          : objectKey

        // validate that requested object is within the scope of this folder
        if (folder.prefix && !objectKey.startsWith(folder.prefix)) {
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
          accessKeyId: isMetadataIdentifier
            ? metadataBucketConfig.accessKeyId
            : folder.accessKeyId,
          secretAccessKey: isMetadataIdentifier
            ? metadataBucketConfig.secretAccessKey
            : folder.secretAccessKey,
          endpoint: isMetadataIdentifier
            ? metadataBucketConfig.endpoint
            : folder.endpoint,
          region:
            (isMetadataIdentifier
              ? metadataBucketConfig.region
              : folder.region) ?? 'auto',
          bucket: isMetadataIdentifier
            ? metadataBucketConfig.bucket
            : folder.bucket,
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
    const s3Client = configureS3Client({
      accessKeyId: folder.accessKeyId,
      secretAccessKey: folder.secretAccessKey,
      endpoint: folder.endpoint,
      region: folder.region,
    })
    if (!permissions.includes(FolderPermissionName.FOLDER_REFRESH)) {
      throw new FolderPermissionMissingError()
    }

    // delete all objects related to this folder
    await this.folderObjectRepository.nativeDelete({ folder: folder.id })
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
        bucketName: folder.bucket,
        continuationToken:
          !continuationToken || continuationToken === ''
            ? undefined
            : continuationToken,
        prefix: folder.prefix,
      })

      // swap in the new batch and the continuationToken for the next batch
      batch = response.result
      continuationToken = response.continuationToken

      for (const obj of batch) {
        const objectKey = obj.key
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
  ) {
    const { folder } = await this.getFolderAsUser({ folderId, userId })

    const s3Client = configureS3Client({
      accessKeyId: folder.accessKeyId,
      secretAccessKey: folder.secretAccessKey,
      endpoint: folder.endpoint,
      region: folder.region,
    })

    const response = await this.s3Service.s3HeadObject({
      s3Client,
      bucketName: folder.bucket,
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
    const previousRecord = await this.folderObjectRepository.findOne({
      folder: folderId,
      objectKey,
    })
    if (previousRecord) {
      previousRecord.sizeBytes = updateRecord.size ?? 0
      previousRecord.lastModified = updateRecord.lastModified ?? 0
      previousRecord.eTag = updateRecord.eTag ?? ''
    }
    const objectKeyParts = objectKey.split('.')
    const extension =
      objectKeyParts.length > 1 ? objectKeyParts.at(-1) : undefined
    const updatedRecord =
      previousRecord ??
      this.folderObjectRepository.create({
        folder: folderId,
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
        ...updateRecord,
      })

    await this.folderObjectRepository.getEntityManager().flush()
    this.socketService.sendToFolderRoom(
      folderId,
      previousRecord
        ? FolderPushMessage.OBJECTS_UPDATED
        : FolderPushMessage.OBJECT_ADDED,
      { folderObject: updatedRecord },
    )

    return updatedRecord
  }

  async tagObject({
    userId,
    folderId,
    objectKey,
    tagId,
  }: {
    userId: string
    folderId: string
    objectKey: string
    tagId: string
  }) {
    const folderAndPermission = await this.getFolderAsUser({ folderId, userId })
    if (
      !folderAndPermission.permissions.includes(
        FolderPermissionName.OBJECT_MANAGE,
      )
    ) {
      throw new FolderPermissionMissingError()
    }

    const folderObject = await this.folderObjectRepository.findOne({
      objectKey,
      folder: folderId,
    })
    const tag = await this.objectTagRepository.findOne({
      id: tagId,
      folder: folderId,
    })

    if (!tag || !folderObject) {
      throw new ObjectTagInvalidError()
    }

    this.objectTagRelationRepository.create({
      tag: tagId,
      object: folderObject.id,
    })

    await this.objectTagRelationRepository.getEntityManager().flush()
  }

  async untagObject({
    userId,
    folderId,
    objectKey,
    tagId,
  }: {
    userId: string
    folderId: string
    objectKey: string
    tagId: string
  }) {
    const folderAndPermission = await this.getFolderAsUser({ folderId, userId })
    if (
      !folderAndPermission.permissions.includes(
        FolderPermissionName.OBJECT_MANAGE,
      )
    ) {
      throw new FolderPermissionMissingError()
    }

    const folderObject = await this.folderObjectRepository.findOne({
      objectKey,
      folder: folderId,
    })

    if (!folderObject) {
      throw new ObjectTagInvalidError()
    }

    const tagRelation = await this.objectTagRelationRepository.findOne({
      tag: tagId,
      object: folderObject.id,
    })

    if (!tagRelation) {
      throw new ObjectTagInvalidError()
    }

    await this.objectTagRelationRepository
      .getEntityManager()
      .removeAndFlush(tagRelation)
  }
}
