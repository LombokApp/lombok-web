import { FolderPushMessage } from '@stellariscloud/types'
import type { FolderOperationNameDataTypes } from '@stellariscloud/workers'
import {
  FOLDER_OPERATION_VALIDATOR_TYPES,
  inputOutputObjectsFromOperationData,
} from '@stellariscloud/workers'
import * as r from 'runtypes'
import { Lifecycle, scoped } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'
import type { Logger } from 'winston'

import { EnvConfigProvider } from '../../../config/env-config.provider'
import type { FolderOperationRequestPayload } from '../../../controllers/folders.controller'
import type {
  ContentAttibutesPayload,
  ContentMetadataPayload,
  CreateMetadataUploadUrlsPayload,
  CreateOutputUploadUrlsPayload,
  MetadataUploadUrlsResponse,
} from '../../../controllers/worker.controller'
import { LoggingService } from '../../../services/logging.service'
import { QueueService } from '../../../services/queue.service'
import { S3Service } from '../../../services/s3.service'
import { SocketService } from '../../../services/socket.service'
import type { Folder } from '../../folder/entities/folder.entity'
import { FolderRepository } from '../../folder/entities/folder.repository'
import type { FolderObject } from '../../folder/entities/folder-object.entity'
import { FolderObjectRepository } from '../../folder/entities/folder-object.repository'
import { SignedURLsRequestMethod } from '../../folder/services/folder.service'
import type { FolderOperation } from '../entities/folder-operation.entity'
import { FolderOperationRepository } from '../entities/folder-operation.repository'
import { OperationRelationType } from '../entities/folder-operation-object.entity'
import {
  FolderOperationInvalidError,
  FolderOperationNotFoundError,
} from '../errors/folder-operation.error'

@scoped(Lifecycle.ContainerScoped)
export class FolderOperationService {
  private readonly logger: Logger

  constructor(
    private readonly loggingService: LoggingService,
    private readonly folderOperationRepository: FolderOperationRepository,
    private readonly socketService: SocketService,
    private readonly folderRepository: FolderRepository,
    private readonly folderObjectRepository: FolderObjectRepository,
    private readonly queueService: QueueService,
    private readonly s3Service: S3Service,
    private readonly configProvider: EnvConfigProvider,
  ) {
    this.logger = this.loggingService.logger
  }

  async enqueueFolderOperation({
    userId,
    folderId,
    operation,
  }: {
    userId: string
    folderId: string
    operation: FolderOperationRequestPayload
  }): Promise<FolderOperation> {
    try {
      const opData = FOLDER_OPERATION_VALIDATOR_TYPES[
        operation.operationName
      ].check(operation.operationData)

      // Resolve input and output objects from the operation data
      const { inputObjects, outputObjects } =
        inputOutputObjectsFromOperationData(operation.operationName, opData)

      // Validate user has permission to access the folders described in inputObjects and outputObjects
      const _folders = await Promise.all(
        [...inputObjects, ...outputObjects].map((o) =>
          this.folderRepository.getFolderAsUser(userId, o.folderId),
        ),
      )

      // Load all input objects so they can be attached to the operation entity
      const inputObjectsWithObject = inputObjects.filter(
        (inputObject) => !!inputObject.objectKey,
      ) as {
        folderId: string
        objectKey: string
      }[]

      const inputObjectEntities: FolderObject[] = await Promise.all(
        inputObjectsWithObject.map((o) =>
          this.folderObjectRepository.findOneOrFail({
            objectKey: o.objectKey,
            folder: o.folderId,
          }),
        ),
      )

      if (inputObjectEntities.length !== inputObjectsWithObject.length) {
        throw new FolderOperationInvalidError()
      }

      const createdOperation = this.folderOperationRepository.create({
        id: uuidV4(),
        operationName: operation.operationName,
        operationData: opData,
        started: false,
        completed: false,
        folder: { id: folderId },
        relatedObjects: inputObjectEntities.map((inputObject) => ({
          operationRelationType: OperationRelationType.INPUT,
          folderId,
          folderObject: inputObject.id,
          objectKey: inputObject.objectKey,
        })),
      })

      // Persist the new operation
      await this.folderOperationRepository
        .getEntityManager()
        .persistAndFlush(createdOperation)

      // Queue the operation
      await this.queueService.add(
        operation.operationName,
        opData as { [key: string]: any },
        {
          jobId: createdOperation.id,
        },
      )

      return createdOperation
    } catch (e) {
      if (e instanceof r.ValidationError) {
        throw new FolderOperationInvalidError()
      }
      throw e
    }
  }

  async registerOperationStart({
    operationId,
  }: {
    operationId: string
  }): Promise<
    {
      folderId: string
      objectKey: string
      url: string
    }[]
  > {
    const operation = await this.folderOperationRepository.findOneOrFail({
      id: operationId,
    })

    if (operation.started) {
      throw new FolderOperationInvalidError()
    }

    const inputObjects = inputOutputObjectsFromOperationData(
      operation.operationName,
      operation.operationData as FolderOperationNameDataTypes[typeof operation.operationName],
    )['inputObjects'].filter((inputObject) => inputObject.objectKey) as {
      folderId: string
      objectKey: string
    }[]

    const signedUrls = inputObjects.length
      ? this._createOperationSignedUrls(
          SignedURLsRequestMethod.GET,
          inputObjects,
        )
      : []

    operation.started = true
    await this.folderOperationRepository.getEntityManager().flush()

    return signedUrls
  }

  async createOperationOutputUploadUrls(
    operationId: string,
    payload: CreateOutputUploadUrlsPayload,
  ) {
    const operation = await this.folderOperationRepository.findOneOrFail({
      id: operationId,
    })

    if (!operation.started || operation.completed) {
      throw new FolderOperationInvalidError()
    }

    // get presigned upload URLs for "output" files
    const outputUploadUrls = await this._createOperationSignedUrls(
      SignedURLsRequestMethod.PUT,
      payload.outputFiles,
    )
    return {
      outputUploadUrls,
    }
  }

  async createOperationMetadataUploadUrls(
    operationId: string,
    payload: CreateMetadataUploadUrlsPayload,
  ) {
    const operation = await this.folderOperationRepository.findOneOrFail({
      id: operationId,
    })

    if (!operation.started || operation.completed) {
      throw new FolderOperationInvalidError()
    }

    const folders: { [folderId: string]: Folder | undefined } = {}

    const metadataUploadUrls: MetadataUploadUrlsResponse[] = []

    // get presigned upload URLs for "metadata" files
    for (const metadata of payload.metadataFiles) {
      const folder =
        folders[metadata.folderId] ??
        (await this.folderRepository.findOneOrFail(
          { id: metadata.folderId },
          { populate: ['contentLocation', 'metadataLocation'] },
        ))
      folders[metadata.folderId] = folder

      const objectKeys = Object.keys(metadata.metadataHashes).map(
        (metadataFileKey) =>
          `${
            folder.metadataLocation.prefix ? folder.metadataLocation.prefix : ''
          }${folder.id}/${metadata.objectKey}/${
            metadata.metadataHashes[metadataFileKey]
          }`,
      )
      const presignedUploadUrls = this.s3Service.createS3PresignedUrls(
        objectKeys.map((k) => ({
          method: SignedURLsRequestMethod.PUT,
          objectKey: k,
          accessKeyId: folder.metadataLocation.accessKeyId,
          secretAccessKey: folder.metadataLocation.secretAccessKey,
          bucket: folder.metadataLocation.bucket,
          endpoint: folder.metadataLocation.endpoint,
          expirySeconds: 86400, // TODO: control this somewhere
          region: folder.metadataLocation.region ?? 'auto',
        })),
      )

      const uploadUrls: { [key: string]: string } = Object.keys(
        metadata.metadataHashes,
      ).reduce(
        (acc, metadataKey, i) => ({
          ...acc,
          [metadataKey]: presignedUploadUrls[i],
        }),
        {},
      )

      metadataUploadUrls.push({
        folderId: metadata.folderId,
        objectKey: metadata.objectKey,
        urls: uploadUrls,
      })
    }

    return {
      metadataUploadUrls,
    }
  }

  async _createOperationSignedUrls(
    op: SignedURLsRequestMethod.GET | SignedURLsRequestMethod.PUT,
    signedUrlRequests: {
      folderId: string
      objectKey: string
    }[],
  ): Promise<
    {
      folderId: string
      objectKey: string
      url: string
    }[]
  > {
    const presignedUrlRequestsByFolderId = signedUrlRequests.reduce<{
      [key: string]: string[] | undefined
    }>((acc, next) => {
      return {
        ...acc,
        [next.folderId]: (acc[next.folderId] ?? []).concat([next.objectKey]),
      }
    }, {})

    const folderIds = Object.keys(presignedUrlRequestsByFolderId)
    let signedUrls: {
      folderId: string
      objectKey: string
      method: SignedURLsRequestMethod
      url: string
    }[] = []

    for (const folderId of folderIds) {
      const folder = await this.folderRepository.findOne(
        {
          id: folderId,
        },
        { populate: ['contentLocation', 'metadataLocation'] },
      )
      if (!folder) {
        throw new FolderOperationInvalidError()
      }
      const folderRequests = presignedUrlRequestsByFolderId[folderId]

      if (!folderRequests) {
        continue
      }

      signedUrls = signedUrls.concat(
        this.s3Service
          .createS3PresignedUrls(
            folderRequests.map((objectKey) => ({
              method: op,
              objectKey,
              accessKeyId: folder.contentLocation.accessKeyId,
              secretAccessKey: folder.contentLocation.secretAccessKey,
              bucket: folder.contentLocation.bucket,
              endpoint: folder.contentLocation.endpoint,
              expirySeconds: 3600,
              region: folder.contentLocation.region ?? 'auto',
            })),
          )
          .map((url, i) => ({
            url,
            folderId,
            method: op,
            objectKey: folderRequests[i],
          })),
      )
    }

    return signedUrls.map((signedUrl) => ({
      url: signedUrl.url,
      folderId: signedUrl.folderId,
      objectKey: signedUrl.objectKey,
    }))
  }

  async updateAttributes(payload: ContentAttibutesPayload[]): Promise<void> {
    for (const { folderId, objectKey, hash, attributes } of payload) {
      const folderObject = await this.folderObjectRepository.findOneOrFail({
        folder: { id: folderId },
        objectKey,
      })

      folderObject.hash = hash
      folderObject.contentAttributes[hash] = attributes
      this.socketService.sendToFolderRoom(
        folderId,
        FolderPushMessage.OBJECTS_UPDATED,
        folderObject,
      )
    }

    await this.folderObjectRepository.getEntityManager().flush()
  }

  async updateMetadata(payload: ContentMetadataPayload[]): Promise<void> {
    for (const { folderId, objectKey, hash, metadata } of payload) {
      const folderObject = await this.folderObjectRepository.findOneOrFail({
        folder: { id: folderId },
        objectKey,
      })

      folderObject.hash = hash
      folderObject.contentMetadata[hash] = {
        ...(folderObject.contentMetadata[hash] ?? {}),
        ...metadata,
      }
      this.socketService.sendToFolderRoom(
        folderId,
        FolderPushMessage.OBJECT_UPDATED,
        folderObject,
      )
    }

    await this.folderObjectRepository.getEntityManager().flush()
  }

  async registerOperationComplete(operationId: string): Promise<void> {
    const operation = await this.folderOperationRepository.findOneOrFail({
      id: operationId,
    })

    if (!operation.started || operation.completed) {
      throw new FolderOperationInvalidError()
    }

    operation.completed = true
    await this.folderOperationRepository.getEntityManager().flush()
  }

  async getFolderOperationAsUser({
    userId,
    folderId,
    folderOperationId,
  }: {
    userId: string
    folderId: string
    folderOperationId: string
  }) {
    const folderOperation = await this.folderOperationRepository.findOne({
      id: folderOperationId,
      folder: {
        id: folderId,
        $or: [{ owner: userId }, { shares: { user: userId } }],
      },
    })
    if (!folderOperation) {
      throw new FolderOperationNotFoundError()
    }
    return folderOperation
  }

  async listFolderOperationsAsUser({
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
    const _folder = this.folderRepository.getFolderAsUser(userId, folderId)
    const [folderOperations, folderOperationsCount] =
      await this.folderOperationRepository.findAndCount(
        {
          folder: {
            id: folderId,
          },
        },
        { offset: offset ?? 0, limit: limit ?? 25 },
      )

    return {
      result: folderOperations,
      meta: { totalCount: folderOperationsCount },
    }
  }
}
