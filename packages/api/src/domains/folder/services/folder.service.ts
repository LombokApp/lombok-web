import { GetObjectCommand } from '@aws-sdk/client-s3'
import * as Sentry from '@sentry/node'
import type { S3ObjectInternal } from '@stellariscloud/types'
import {
  MediaType,
  mediaTypeFromMimeType,
  parseSort,
} from '@stellariscloud/utils'
import { Queue } from 'bullmq'
import { Lifecycle, scoped } from 'tsyringe'
import type { Logger } from 'winston'

import { EnvConfigProvider } from '../../../config/env-config.provider'
import { QueueName } from '../../../constants/queue.constants'
import { LoggingService } from '../../../services/logging.service'
import { RedisService } from '../../../services/redis.service'
import { configureS3Client, S3Service } from '../../../services/s3.service'
import { registerExitHandler } from '../../../util/process.util'
import { UserService } from '../../user/services/user.service'
import { FoldersJobName } from '../constants/folders.constants'
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
  FolderNotFoundError,
  FolderObjectNotFoundError,
  FolderPermissionInvalidError,
  FolderPermissionMissingError,
  FolderShareNotFoundError,
  FolderTagNotFoundError,
  ObjectTagInvalidError,
} from '../errors/folder.error'
import { S3ConnectionNotFoundError } from '../errors/s3-connection.error'
import type { FolderObjectContentMetadata } from '../transfer-objects/folder-object.dto'
import type { CreateFolderSharePayload } from '../transfer-objects/folder-share.dto'
import type { FoldersJob } from '../workers/folders.worker'

export type SignedURLsRequestPayload = {
  objectKey: string
  method: 'PUT' | 'DELETE' | 'GET'
}[]

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

const METADATA_POSTFIX = '____metadata.json'
const PREVIEWS_POSTFIX = '____previews'

const isKeyMetadataRelated = (key: string) => {
  return (
    key.endsWith(METADATA_POSTFIX) ||
    key.split('/').find((part) => part.endsWith(PREVIEWS_POSTFIX))
  )
}

const OWNER_PERMISSIONS = Object.values(FolderPermissionName)

export interface FolderObjectUpdate {
  lastModified?: number
  size?: number
  eTag?: string
  contentMetadata?: FolderObjectContentMetadata
}

@scoped(Lifecycle.ContainerScoped)
export class FolderService {
  private readonly redis = this.redisService.getConnection('queueService')

  private readonly foldersQueue = new Queue<
    FoldersJob['data'],
    FoldersJob['returnvalue'],
    FoldersJob['name']
  >(QueueName.Folders, {
    connection: this.redis,
  })

  private readonly logger: Logger

  constructor(
    private readonly config: EnvConfigProvider,
    private readonly objectTagRepository: ObjectTagRepository,
    private readonly objectTagRelationRepository: ObjectTagRelationRepository,
    private readonly folderObjectRepository: FolderObjectRepository,
    private readonly folderShareRepository: FolderShareRepository,
    private readonly folderRepository: FolderRepository,
    private readonly userService: UserService,
    private readonly s3ConnectionRepository: S3ConnectionRepository,
    private readonly loggingService: LoggingService,
    private readonly s3Service: S3Service,
    private readonly redisService: RedisService,
  ) {
    this.foldersQueue.on('error', (error: Error) => {
      Sentry.captureException(error)
      console.error('FoldersWorker Queue error', error)
    })

    registerExitHandler(async () => {
      await this.foldersQueue.close()
      await this.foldersQueue.disconnect()
    })

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
      endpoint: s3Connection.endpoint,
      region: s3Connection.region,
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

  async deleteFolderObject({
    userId,
    folderId,
    objectKey,
  }: {
    userId: string
    folderId: string
    objectKey: string
  }): Promise<boolean> {
    const { permissions } = await this.getFolderAsUser({ folderId, userId })

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

  async getFolderObject({
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
          ...(search ? { objectKey: { $like: `%${search}%` } } : {}),
          folder: folderId,
          tags: tagId ? { tag: tagId } : undefined,
        },
        { offset: offset ?? 0, limit: limit ?? 25, orderBy: parseSort(sort) },
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

  // async associateObjectTag({
  //   userId,
  //   objectTagId,
  //   body,
  // }: {
  //   body: { name: string }
  //   userId: string
  //   objectTagId: string
  // }): Promise<ObjectTag> {
  //   const { folder, permissions } = await this.getFolderAsUser(folderId, userId)
  //   const { objectTag } = await this.getObjectTagAsUser(objectTagId, userId)
  //   if (!folder) {
  //     throw new FolderNotFoundError()
  //   }
  //   if (!permissions?.includes('tag:associate')) {
  //     throw new FolderPermissionMissingError()
  //   }
  //   const objectTagRelation = this.objectTagRelationRepository.create({
  //     tag: '',
  //     name: body.name,
  //   })
  //   await this.objectTagRelationRepository.flush()
  //   return objectTagRelation
  // }

  async createPresignedURLs(
    folderId: string,
    userId: string,
    urls: SignedURLsRequestPayload,
  ) {
    const requiresWritePermission = !!urls.find((u) =>
      ['POST', 'DELETE'].includes(u.method.toUpperCase()),
    )
    const { folder, permissions } = await this.getFolderAsUser({
      folderId,
      userId,
    })
    if (
      requiresWritePermission &&
      !permissions.includes(FolderPermissionName.OBJECT_EDIT)
    ) {
      throw new FolderPermissionMissingError()
    }
    const s3Client = configureS3Client({
      accessKeyId: folder.accessKeyId,
      secretAccessKey: folder.secretAccessKey,
      endpoint: folder.endpoint,
      region: folder.region,
    })
    return this.s3Service.s3GetPresignedURLs(s3Client, folder.bucket, urls)
  }

  async queueRefreshFolder(folderId: string, userId: string) {
    await this.foldersQueue.add(FoldersJobName.RefreshFolderObjects, {
      folderId,
      userId,
    })
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
        if (isKeyMetadataRelated(objectKey)) {
          if (objectKey.endsWith(METADATA_POSTFIX)) {
            // this is the metadata json file (as opposed to a preview file or other)
            const getSerializedContentMetadataFromS3Response =
              await s3Client.send(
                new GetObjectCommand({
                  Bucket: folder.bucket,
                  Key: objectKey,
                }),
              )
            const body =
              await getSerializedContentMetadataFromS3Response.Body?.transformToString()
            try {
              const parsedBody: FolderObjectContentMetadata = body
                ? JSON.parse(body)
                : undefined
              const referencedObjectKey = objectKey.slice(
                0,
                objectKey.length - METADATA_POSTFIX.length,
              )
              await this.saveUpdatedFolderObjectContentMetadata(
                folder.id,
                referencedObjectKey,
                parsedBody,
              )
            } catch (e) {
              console.error(
                'Error processing metadata file [%s]:',
                objectKey,
                e,
              )
            }
          }
        } else if (obj.size > 0) {
          // this is a user file
          // console.log('Trying to update key metadata [%s]:', objectKey, obj)
          await this.updateFolderObjectInDB(folder.id, objectKey, obj)
        }
        // remove that just completed one from the current batch
        // this.indexingJobContext.batch = this.indexingJobContext.batch.slice(1)
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

  async saveUpdatedFolderObjectContentMetadataAsUser(
    userId: string,
    folderId: string,
    objectKey: string,
    contentMetadata: FolderObjectContentMetadata,
  ) {
    const { permissions } = await this.getFolderAsUser({ folderId, userId })
    if (!permissions.includes(FolderPermissionName.OBJECT_MANAGE)) {
      throw new FolderPermissionMissingError()
    }
    return this.saveUpdatedFolderObjectContentMetadata(
      folderId,
      objectKey,
      contentMetadata,
    )
  }

  async saveUpdatedFolderObjectContentMetadata(
    folderId: string,
    objectKey: string,
    contentMetadata: FolderObjectContentMetadata,
  ) {
    const folderObject = await this.folderObjectRepository.findOne({
      folder: folderId,
      objectKey,
    })

    if (!folderObject) {
      throw new Error(
        'Attempting to update content metadata for non-existent record.',
      )
    }
    folderObject.contentMetadata = contentMetadata
    // this.currentPreviewGenerationJobs[objectKey] = undefined
    // await this.db.updateFolderObject(folderId, objectKey, folderObject)
    await this.folderObjectRepository.getEntityManager().flush()
    return folderObject
  }

  async updateFolderObjectS3MetadataAsUser(
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
    const previousRecord = (await this.folderObjectRepository.findOne({
      folder: folderId,
      objectKey,
    })) as FolderObject | null
    if (previousRecord) {
      previousRecord.contentMetadata = updateRecord.contentMetadata
      previousRecord.sizeBytes = updateRecord.size ?? 0
      previousRecord.lastModified = updateRecord.lastModified ?? 0
      previousRecord.eTag = updateRecord.eTag ?? ''
    }
    const updatedRecord =
      previousRecord ??
      this.folderObjectRepository.create({
        folder: folderId,
        objectKey,
        lastModified: updateRecord.lastModified ?? 0,
        eTag: updateRecord.eTag ?? '',
        sizeBytes: updateRecord.size ?? 0,
        mediaType: updateRecord.contentMetadata?.mimeType
          ? mediaTypeFromMimeType(updateRecord.contentMetadata.mimeType)
          : MediaType.Unknown,
        ...updateRecord,
      })

    await this.folderObjectRepository.getEntityManager().flush()
    // if (!this.indexingJobContext) {
    //   if (previousRecord) {
    //     this.broadcast({
    //       name: FolderPushMessage.OBJECT_UPDATED,
    //       payload: { object: updatedRecord },
    //     })
    //   } else {
    //     this.broadcast({
    //       name: FolderPushMessage.OBJECT_ADDED,
    //       payload: { object: updatedRecord },
    //     })
    //   }
    // }

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
