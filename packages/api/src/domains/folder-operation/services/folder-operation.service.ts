import { FolderPushMessage } from '@stellariscloud/types'
import type {
  FolderOperationName,
  FolderOperationNameDataTypes,
} from '@stellariscloud/workers'
import {
  FOLDER_OPERATION_VALIDATOR_TYPES,
  inputOutputObjectsFromOperationData,
} from '@stellariscloud/workers'
import { and, eq, inArray, isNotNull, isNull, lt, or, sql } from 'drizzle-orm'
import * as r from 'runtypes'
import { Lifecycle, scoped } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'
import type { Logger } from 'winston'

import { QueueName } from '../../../constants/app-worker-constants'
import type { FolderOperationRequestPayload } from '../../../controllers/folders.controller'
import type {
  ContentAttibutesPayload,
  ContentMetadataPayload,
  CreateMetadataUploadUrlsPayload,
  CreateOutputUploadUrlsPayload,
  MetadataUploadUrlsResponse,
} from '../../../controllers/worker.controller'
import { UnauthorizedError } from '../../../errors/auth.error'
import { OrmService } from '../../../orm/orm.service'
import { LoggingService } from '../../../services/logging.service'
import { QueueService } from '../../../services/queue.service'
import { S3Service } from '../../../services/s3.service'
import { SocketService } from '../../../services/socket.service'
import { parseSort } from '../../../util/sort.util'
import type { FolderWithoutLocations } from '../../folder/entities/folder.entity'
import { foldersTable } from '../../folder/entities/folder.entity'
import type { FolderObject } from '../../folder/entities/folder-object.entity'
import { folderObjectsTable } from '../../folder/entities/folder-object.entity'
import {
  FolderNotFoundError,
  FolderObjectNotFoundError,
} from '../../folder/errors/folder.error'
import { SignedURLsRequestMethod } from '../../folder/services/folder.service'
import { storageLocationsTable } from '../../storage-location/entities/storage-location.entity'
import { StorageLocationNotFoundError } from '../../storage-location/errors/storage-location.error'
import type { User } from '../../user/entities/user.entity'
import {
  FolderOperationSort,
  FolderOperationStatus,
} from '../constants/folder-operation.constants'
import type {
  FolderOperation,
  NewFolderOperation,
} from '../entities/folder-operation.entity'
import { folderOperationsTable } from '../entities/folder-operation.entity'
import type { NewFolderOperationObject } from '../entities/folder-operation-object.entity'
import { folderOperationObjectsTable } from '../entities/folder-operation-object.entity'
import {
  FolderOperationInvalidError,
  FolderOperationNotFoundError,
} from '../errors/folder-operation.error'

@scoped(Lifecycle.ContainerScoped)
export class FolderOperationService {
  private readonly logger: Logger

  constructor(
    private readonly loggingService: LoggingService,
    private readonly socketService: SocketService,
    private readonly queueService: QueueService,
    private readonly s3Service: S3Service,
    private readonly ormService: OrmService,
  ) {
    this.logger = this.loggingService.logger
  }

  async enqueueFolderOperations({
    userId,
    folderId,
    operations,
  }: {
    userId: string
    folderId: string
    operations: FolderOperationRequestPayload[]
  }): Promise<FolderOperation[]> {
    const folderOperations: NewFolderOperation[] = []
    const inputObjectRelations: NewFolderOperationObject[] = []
    const touchedFolderIds: { [key: string]: true } = {}
    try {
      for (const operation of operations) {
        const opData = FOLDER_OPERATION_VALIDATOR_TYPES[
          operation.operationName
        ].check(operation.operationData)

        // Resolve input and output objects from the operation data
        const { inputObjects, outputObjects } =
          inputOutputObjectsFromOperationData(operation.operationName, opData)

        for (const inputOutputObject of [...inputObjects, ...outputObjects]) {
          touchedFolderIds[inputOutputObject.folderId] = true
        }

        // Load all input objects so they can be attached to the operation entity
        const inputObjectsWithObject = inputObjects.filter(
          (inputObject) => !!inputObject.objectKey,
        ) as {
          folderId: string
          objectKey: string
        }[]

        const inputObjectEntities: FolderObject[] = await Promise.all(
          inputObjectsWithObject.map((o) => {
            return this.ormService.db.query.folderObjectsTable
              .findFirst({
                where: and(
                  eq(folderObjectsTable.objectKey, o.objectKey),
                  eq(folderObjectsTable.folderId, o.folderId),
                ),
              })
              .then((folderObject) => {
                if (!folderObject) {
                  throw new FolderObjectNotFoundError()
                }
                return folderObject
              })
          }),
        )

        if (inputObjectEntities.length !== inputObjectsWithObject.length) {
          throw new FolderOperationInvalidError()
        }

        const now = new Date()

        const folderOperation = {
          id: uuidV4(),
          operationName: operation.operationName,
          operationData: opData,
          started: false,
          completed: false,
          folderId,
          createdAt: now,
          updatedAt: now,
        }

        inputObjectEntities
          .map((inputObject) => ({
            id: uuidV4(),
            operationRelationType: 'INPUT',
            folderId,
            operationId: folderOperation.id,
            folderObjectId: inputObject.id,
            objectKey: inputObject.objectKey,
            createdAt: now,
            updatedAt: now,
          }))
          .forEach((o) => inputObjectRelations.push(o))

        // trigger a job to send unstarted work to the workers
        if (
          (await this.queueService.getWaitingCount(
            QueueName.ExecuteUnstartedWork,
          )) === 0
        ) {
          await this.queueService.add(QueueName.ExecuteUnstartedWork, {
            jobId: uuidV4(),
            delay: 1000,
          })
        }

        folderOperations.push(folderOperation)
      }

      // Validate user has permission to access the folders described in inputObjects and outputObjects
      const touchedFolderIdsArr = Object.keys(touchedFolderIds)
      const touchedFolders =
        await this.ormService.db.query.foldersTable.findMany({
          where: and(
            eq(foldersTable.ownerId, userId),
            inArray(foldersTable.id, touchedFolderIdsArr),
          ),
        })

      if (touchedFolders.length !== touchedFolderIdsArr.length) {
        throw new FolderNotFoundError()
      }

      return await this.ormService.db.transaction(async (tx) => {
        const ops = await tx
          .insert(folderOperationsTable)
          .values(folderOperations)
          .returning()

        await tx
          .insert(folderOperationObjectsTable)
          .values(inputObjectRelations)
        return ops
      })
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
    const operation =
      await this.ormService.db.query.folderOperationsTable.findFirst({
        where: eq(folderOperationsTable.id, operationId),
      })

    if (!operation) {
      throw new FolderOperationNotFoundError()
    }

    if (operation.started) {
      throw new FolderOperationInvalidError()
    }
    const operationName = operation.operationName as FolderOperationName
    const inputObjects = inputOutputObjectsFromOperationData(
      operationName,
      operation.operationData as FolderOperationNameDataTypes[typeof operationName],
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

    await this.ormService.db
      .update(folderOperationsTable)
      .set({ started: true })
      .where(eq(folderOperationsTable.id, operationId))

    return signedUrls
  }

  async createOperationOutputUploadUrls(
    operationId: string,
    payload: CreateOutputUploadUrlsPayload,
  ) {
    const operation =
      await this.ormService.db.query.folderOperationsTable.findFirst({
        where: eq(folderOperationsTable.id, operationId),
      })

    if (!operation) {
      throw new FolderOperationNotFoundError()
    }

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
    const operation =
      await this.ormService.db.query.folderOperationsTable.findFirst({
        where: eq(folderOperationsTable.id, operationId),
      })

    if (!operation) {
      throw new FolderOperationNotFoundError()
    }

    if (!operation.started || operation.completed) {
      throw new FolderOperationInvalidError()
    }

    const folders: { [folderId: string]: FolderWithoutLocations | undefined } =
      {}

    const metadataUploadUrls: MetadataUploadUrlsResponse[] = []

    // get presigned upload URLs for "metadata" files
    for (const metadata of payload.metadataFiles) {
      const folder =
        folders[metadata.folderId] ??
        (await this.ormService.db.query.foldersTable.findFirst({
          where: eq(folderObjectsTable.id, metadata.folderId),
        }))
      folders[metadata.folderId] = folder

      if (!folder) {
        throw new FolderNotFoundError()
      }

      const metadataLocation =
        await this.ormService.db.query.storageLocationsTable.findFirst({
          where: eq(storageLocationsTable.id, folder.metadataLocationId),
        })

      if (!metadataLocation) {
        throw new StorageLocationNotFoundError()
      }

      const objectKeys = Object.keys(metadata.metadataHashes).map(
        (metadataFileKey) =>
          `${metadataLocation.prefix ? metadataLocation.prefix : ''}${
            folder.id
          }/${metadata.objectKey}/${metadata.metadataHashes[metadataFileKey]}`,
      )
      const presignedUploadUrls = this.s3Service.createS3PresignedUrls(
        objectKeys.map((k) => ({
          method: SignedURLsRequestMethod.PUT,
          objectKey: k,
          accessKeyId: metadataLocation.accessKeyId,
          secretAccessKey: metadataLocation.secretAccessKey,
          bucket: metadataLocation.bucket,
          endpoint: metadataLocation.endpoint,
          expirySeconds: 86400, // TODO: control this somewhere
          region: metadataLocation.region,
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
      const folder = await this.ormService.db.query.foldersTable.findFirst(
        {
          where: eq(foldersTable.id, folderId),
        },
        // { populate: ['contentLocation', 'metadataLocation'] },
      )
      if (!folder) {
        throw new FolderOperationInvalidError()
      }
      const folderRequests = presignedUrlRequestsByFolderId[folderId]

      if (!folderRequests) {
        continue
      }

      const contentLocation =
        await this.ormService.db.query.storageLocationsTable.findFirst({
          where: eq(storageLocationsTable.id, folder.metadataLocationId),
        })

      if (!contentLocation) {
        throw new StorageLocationNotFoundError()
      }

      signedUrls = signedUrls.concat(
        this.s3Service
          .createS3PresignedUrls(
            folderRequests.map((objectKey) => ({
              method: op,
              objectKey,
              accessKeyId: contentLocation.accessKeyId,
              secretAccessKey: contentLocation.secretAccessKey,
              bucket: contentLocation.bucket,
              endpoint: contentLocation.endpoint,
              expirySeconds: 3600,
              region: contentLocation.region,
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
      const folderObject =
        await this.ormService.db.query.folderObjectsTable.findFirst({
          where: and(
            eq(folderObjectsTable.folderId, folderId),
            eq(folderObjectsTable.objectKey, objectKey),
          ),
        })
      if (!folderObject) {
        throw new FolderObjectNotFoundError()
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

  async updateMetadata(payload: ContentMetadataPayload[]): Promise<void> {
    for (const { folderId, objectKey, hash, metadata } of payload) {
      const folderObject =
        await this.ormService.db.query.folderObjectsTable.findFirst({
          where: and(
            eq(folderObjectsTable.folderId, folderId),
            eq(folderObjectsTable.objectKey, objectKey),
          ),
        })

      if (!folderObject) {
        throw new FolderObjectNotFoundError()
      }

      const newContentMetadata = {
        ...folderObject.contentMetadata,
        [hash]: { ...folderObject.contentMetadata[hash], ...metadata },
      }

      const updatedObject = (
        await this.ormService.db
          .update(folderObjectsTable)
          .set({
            hash,
            contentMetadata: newContentMetadata,
          })
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

  async registerOperationComplete(operationId: string): Promise<void> {
    const operation =
      await this.ormService.db.query.folderOperationsTable.findFirst({
        where: eq(folderOperationsTable.id, operationId),
      })

    if (!operation) {
      throw new FolderOperationNotFoundError()
    }

    if (!operation.started || operation.completed) {
      throw new FolderOperationInvalidError()
    }

    await this.ormService.db
      .update(folderOperationsTable)
      .set({ completed: true })
      .where(eq(folderOperationsTable.id, operationId))
  }

  // async getFolderOperationAsUser({
  //   userId,
  //   folderId,
  //   folderOperationId,
  // }: {
  //   userId: string
  //   folderId: string
  //   folderOperationId: string
  // }) {
  //   const folderOperation =
  //     await this.ormService.db.query.folderOperationTable.findFirst({
  //       where: eq(folderOperationTable.id, folderOperationId),
  //     })

  //   if (!folderOperation) {
  //     throw new FolderOperationNotFoundError()
  //   }
  //   return folderOperation
  // }

  async listFolderOperationsAsUser(
    actor: User,
    {
      folderId,
      offset,
      limit,
      sort = FolderOperationSort.CreatedAtDesc,
      status,
    }: {
      folderId: string
      offset?: number
      limit?: number
      sort?: FolderOperationSort
      status?: FolderOperationStatus
    },
  ) {
    if (!actor.id) {
      throw new UnauthorizedError()
    }
    const _folder = await this.ormService.db.query.foldersTable.findFirst({
      where: and(
        eq(foldersTable.ownerId, actor.id),
        eq(foldersTable.id, folderId),
      ),
    })

    if (!_folder) {
      throw new FolderNotFoundError()
    }

    const folderOperations =
      await this.ormService.db.query.folderOperationsTable.findMany({
        where: and(
          ...[eq(folderOperationsTable.folderId, folderId)]
            .concat(
              status === FolderOperationStatus.Pending
                ? eq(folderOperationsTable.started, false)
                : [],
            )
            .concat(
              status === FolderOperationStatus.Failed
                ? isNotNull(folderOperationsTable.error)
                : [],
            )
            .concat(
              status === FolderOperationStatus.Complete
                ? [
                    eq(folderOperationsTable.completed, true),
                    isNull(folderOperationsTable.error),
                  ]
                : [],
            ),
        ),
        limit,
        offset,
        orderBy: parseSort(folderOperationsTable, sort),
      })
    const [folderOperationsCount] = await this.ormService.db
      .select({ count: sql<string | null>`count(*)` })
      .from(folderOperationsTable)

    return {
      result: folderOperations,
      meta: { totalCount: parseInt(folderOperationsCount.count ?? '0', 10) },
    }
  }

  async executeUnstartedWork() {
    const OPERATION_FETCH_LIMIT = 100
    let unassignableTaskCount = 0
    const unstartedWork =
      await this.ormService.db.query.folderOperationsTable.findMany({
        where: or(
          and(
            eq(folderOperationsTable.started, false),
            isNull(folderOperationsTable.assignedFolderWorkerId),
          ),
          and(
            eq(folderOperationsTable.started, false),
            isNotNull(folderOperationsTable.assignedFolderWorkerId),
            lt(folderOperationsTable.assignedAt, new Date(Date.now() - 5000)),
          ),
        ),
        limit: OPERATION_FETCH_LIMIT,
      })

    for (const folderOperation of unstartedWork) {
      const assignedFolderWorkerId =
        await this.socketService.sendFolderOperationToWorker(folderOperation)
      if (assignedFolderWorkerId) {
        await this.ormService.db
          .update(folderOperationsTable)
          .set({
            assignedFolderWorkerId,
            assignedAt: new Date(),
          })
          .where(eq(folderOperationsTable.id, folderOperation.id))
      } else {
        unassignableTaskCount++
      }
    }
    if (
      (unassignableTaskCount > 0 &&
        (await this.queueService.getWaitingCount(
          QueueName.ExecuteUnstartedWork,
        )) === 0) ||
      unstartedWork.length === OPERATION_FETCH_LIMIT
    ) {
      await this.queueService.add(QueueName.ExecuteUnstartedWork, {
        jobId: uuidV4(),
        delay: (unstartedWork.length / unassignableTaskCount) * 2000,
      })
    }
  }
}
