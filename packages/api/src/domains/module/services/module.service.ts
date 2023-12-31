import { MediaType } from '@stellariscloud/types'
import { EnumType } from '@stellariscloud/utils'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import * as r from 'runtypes'
import { container, singleton } from 'tsyringe'
import { v4 as uuidV4 } from 'uuid'

import { UnauthorizedError } from '../../../errors/auth.error'
import { OrmService } from '../../../orm/orm.service'
import { S3Service } from '../../../services/s3.service'
import { SocketService } from '../../../services/socket.service'
import { eventReceiptsTable } from '../../event/entities/event-receipt.entity'
import type { FolderWithoutLocations } from '../../folder/entities/folder.entity'
import { foldersTable } from '../../folder/entities/folder.entity'
import { folderObjectsTable } from '../../folder/entities/folder-object.entity'
import { FolderNotFoundError } from '../../folder/errors/folder.error'
import {
  FolderService,
  SignedURLsRequestMethod,
} from '../../folder/services/folder.service'
import { storageLocationsTable } from '../../storage-location/entities/storage-location.entity'
import { StorageLocationNotFoundError } from '../../storage-location/errors/storage-location.error'
import type { User } from '../../user/entities/user.entity'
import { CORE_MODULE_ID } from '../constants/core-module.config'
import { ModuleSocketAPIRequest } from '../constants/module-api-messages'
import type { Module } from '../entities/module.entity'
import { modulesTable } from '../entities/module.entity'
import { moduleLogEntriesTable } from '../entities/module-log-entry.entity'

export type MetadataUploadUrlsResponse = {
  folderId: string
  objectKey: string
  url: string
}[]

const ModuleLogEntryValidator = r.Record({
  name: r.String,
  message: r.String,
  level: r.String,
  data: r.Unknown.optional(),
})

const UpdateAttributesValidator = r.Record({
  updates: r.Array(
    r.Record({
      folderId: r.String,
      objectKey: r.String,
      hash: r.String,
      attributes: r.Record({
        mediaType: EnumType(MediaType),
        mimeType: r.String,
        height: r.Number,
        width: r.Number,
        orientation: r.Number,
        lengthMs: r.Number,
        bitrate: r.Number,
      }),
    }),
  ),
  eventId: r.String.optional(),
})

const AttemptStartHandleEventValidator = r.Record({
  eventKeys: r.Array(r.String),
})

const GetContentSignedURLsValidator = r.Record({
  requests: r.Array(
    r.Record({
      folderId: r.String,
      objectKey: r.String,
      method: EnumType(SignedURLsRequestMethod),
    }),
  ),
  eventId: r.String.optional(),
})

const GetMetadataSignedURLsValidator = r.Record({
  eventId: r.String.optional(),
  requests: r.Array(
    r.Record({
      folderId: r.String,
      objectKey: r.String,
      contentHash: r.String,
      method: EnumType(SignedURLsRequestMethod),
      metadataHash: r.String,
    }),
  ),
})

const MetadataEntryRecord = r.Record({
  mimeType: r.String,
  size: r.Number,
  hash: r.String,
})

const UpdateMetadataValidator = r.Record({
  updates: r.Array(
    r.Record({
      folderId: r.String,
      objectKey: r.String,
      hash: r.String,
      metadata: r.Dictionary(MetadataEntryRecord, r.String),
    }),
  ),
  eventId: r.String.optional(),
})

const FailHandleEventValidator = r.Record({
  eventReceiptId: r.String,
  error: r.String,
})

@singleton()
export class ModuleService {
  constructor(
    private readonly ormService: OrmService,
    private readonly s3Service: S3Service,
    private readonly folderService: FolderService,
  ) {}

  _socketService?: SocketService

  get socketService() {
    if (!this._socketService) {
      this._socketService = container.resolve(SocketService)
    }
    return this._socketService
  }

  async listModulesAsAdmin(user: User) {
    if (!user.isAdmin) {
      throw new UnauthorizedError()
    }
    const connectedModuleInstances = this.socketService.getModuleConnections()
    return {
      connected: connectedModuleInstances,
      installed: await this.listModules(),
    }
  }

  async listModules() {
    const modules = await this.ormService.db.query.modulesTable.findMany()
    return modules
  }

  async getModuleAsAdmin(user: User, moduleId: string) {
    if (!user.isAdmin) {
      throw new UnauthorizedError()
    }

    const module = await this.ormService.db.query.modulesTable.findFirst({
      where: and(eq(modulesTable.id, moduleId), eq(modulesTable.enabled, true)),
    })

    return module
  }

  async getModule(moduleId: string) {
    const module = await this.ormService.db.query.modulesTable.findFirst({
      where: and(eq(modulesTable.id, moduleId), eq(modulesTable.enabled, true)),
    })

    return module
  }

  async getCoreModuleAsAdmin(user: User) {
    if (!user.isAdmin) {
      throw new UnauthorizedError()
    }

    return this.getCoreModule()
  }

  async getCoreModule(): Promise<Module | undefined> {
    return this.getModule(CORE_MODULE_ID)
  }

  async handleModuleRequest(handlerId: string, moduleId: string, message: any) {
    const now = new Date()
    if (ModuleSocketAPIRequest.guard(message)) {
      const requestData = message.data
      switch (message.name) {
        case 'SAVE_LOG_ENTRY':
          if (ModuleLogEntryValidator.guard(requestData)) {
            await this.ormService.db.insert(moduleLogEntriesTable).values([
              {
                ...requestData,
                createdAt: now,
                updatedAt: now,
                moduleId,
                id: uuidV4(),
              },
            ])
          } else {
            return {
              error: {
                code: 400,
                message: 'Invalid request.',
              },
            }
          }
          break
        case 'GET_CONTENT_SIGNED_URLS': {
          if (GetContentSignedURLsValidator.guard(requestData)) {
            return { result: await this.createSignedContentUrls(requestData) }
          } else {
            return {
              error: {
                code: 400,
                message: 'Invalid request.',
              },
            }
          }
        }
        case 'GET_METADATA_SIGNED_URLS': {
          if (GetMetadataSignedURLsValidator.guard(requestData)) {
            return {
              result: await this.createSignedMetadataUrls(requestData),
            }
          } else {
            return {
              error: {
                code: 400,
                message: 'Invalid request.',
              },
            }
          }
        }
        case 'UPDATE_CONTENT_ATTRIBUTES': {
          if (UpdateAttributesValidator.guard(requestData)) {
            await this.folderService.updateFolderObjectAttributes(
              requestData.updates,
            )
            return {
              result: undefined,
            }
          } else {
            return {
              error: {
                code: 400,
                message: 'Invalid request.',
              },
            }
          }
        }
        case 'UPDATE_CONTENT_METADATA': {
          if (UpdateMetadataValidator.guard(requestData)) {
            await this.folderService.updateFolderObjectMetadata(
              requestData.updates,
            )
            return {
              result: undefined,
            }
          } else {
            return {
              error: {
                code: 400,
                message: 'Invalid request.',
              },
            }
          }
        }
        case 'COMPLETE_HANDLE_EVENT': {
          if (r.String.guard(requestData)) {
            const eventReceipt =
              await this.ormService.db.query.eventReceiptsTable.findFirst({
                where: and(
                  eq(eventReceiptsTable.id, requestData),
                  eq(eventReceiptsTable.moduleId, moduleId),
                ),
              })
            if (
              !eventReceipt ||
              eventReceipt.completedAt ||
              eventReceipt.handlerId !== handlerId ||
              !eventReceipt.startedAt
            ) {
              return {
                error: {
                  code: 400,
                  message: 'Invalid request.',
                },
              }
            }
            return {
              result: await this.ormService.db
                .update(eventReceiptsTable)
                .set({ completedAt: new Date() })
                .where(eq(eventReceiptsTable.id, eventReceipt.id)),
            }
          }
          break
        }
        case 'ATTEMPT_START_HANDLE_EVENT': {
          if (AttemptStartHandleEventValidator.guard(requestData)) {
            const eventReceipt =
              await this.ormService.db.query.eventReceiptsTable.findFirst({
                where: and(
                  eq(eventReceiptsTable.moduleId, moduleId),
                  inArray(eventReceiptsTable.eventKey, requestData.eventKeys),
                  isNull(eventReceiptsTable.startedAt),
                ),
                with: {
                  event: true,
                },
              })
            if (
              !eventReceipt ||
              eventReceipt.completedAt ||
              eventReceipt.handlerId ||
              eventReceipt.startedAt
            ) {
              return {
                result: undefined,
                error: {
                  code: 400,
                  message: 'Invalid request.',
                },
              }
            }

            return {
              result: {
                ...(
                  await this.ormService.db
                    .update(eventReceiptsTable)
                    .set({ startedAt: new Date(), handlerId })
                    .where(eq(eventReceiptsTable.id, eventReceipt.id))
                    .returning()
                )[0],
                data: {
                  folderId: eventReceipt.event.data.folderId,
                  objectKey: eventReceipt.event.data.objectKey,
                },
              },
            }
          }
          break
        }
        case 'FAIL_HANDLE_EVENT': {
          if (FailHandleEventValidator.guard(requestData)) {
            const eventReceipt =
              await this.ormService.db.query.eventReceiptsTable.findFirst({
                where: and(
                  eq(eventReceiptsTable.id, requestData.eventReceiptId),
                  eq(eventReceiptsTable.moduleId, moduleId),
                ),
              })
            if (
              !eventReceipt?.startedAt ||
              eventReceipt.completedAt ||
              eventReceipt.handlerId !== handlerId
            ) {
              return {
                result: undefined,
                error: {
                  code: 400,
                  message: 'Invalid request.',
                },
              }
            }

            return {
              result: await this.ormService.db
                .update(eventReceiptsTable)
                .set({ error: requestData.error, errorAt: new Date() })
                .where(eq(eventReceiptsTable.id, eventReceipt.id)),
            }
          }
          break
        }
      }
      return {
        result: undefined,
        error: {
          code: 404,
          message: 'Request not recognised.',
        },
      }
    }
  }
  broadcastEventsPending(moduleId: string, eventKey: string, count: number) {
    this.socketService.notifyModuleWorkersOfPendingEvents(
      moduleId,
      eventKey,
      count,
    )
  }

  async createSignedContentUrls(payload: {
    eventId?: string
    requests: {
      folderId: string
      objectKey: string
      method: SignedURLsRequestMethod
    }[]
  }) {
    // get presigned upload URLs for content objects
    const urls = await this._createSignedUrls(payload.requests)
    return {
      urls,
    }
  }

  async createSignedMetadataUrls(payload: {
    eventId?: string
    requests: {
      folderId: string
      objectKey: string
      contentHash: string
      method: SignedURLsRequestMethod
      metadataHash: string
    }[]
  }) {
    const folders: { [folderId: string]: FolderWithoutLocations | undefined } =
      {}

    const urls: MetadataUploadUrlsResponse = this.s3Service
      .createS3PresignedUrls(
        await Promise.all(
          payload.requests.map(async (request) => {
            const folder =
              folders[request.folderId] ??
              (await this.ormService.db.query.foldersTable.findFirst({
                where: eq(folderObjectsTable.id, request.folderId),
              }))
            folders[request.folderId] = folder

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
            return {
              method: request.method,
              objectKey: `${
                metadataLocation.prefix ? metadataLocation.prefix : ''
              }${folder.id}/${request.objectKey}/${request.metadataHash}`,
              accessKeyId: metadataLocation.accessKeyId,
              secretAccessKey: metadataLocation.secretAccessKey,
              bucket: metadataLocation.bucket,
              endpoint: metadataLocation.endpoint,
              expirySeconds: 86400, // TODO: control this somewhere
              region: metadataLocation.region,
            }
          }),
        ),
      )
      .map((_url, i) => {
        return {
          folderId: payload.requests[i].folderId,
          objectKey: payload.requests[i].objectKey,
          url: _url,
        }
      })

    // get presigned upload URLs for "metadata" files
    // for (const request of payload.requests) {
    //   const folder =
    //     folders[request.folderId] ??
    //     (await this.ormService.db.query.foldersTable.findFirst({
    //       where: eq(folderObjectsTable.id, request.folderId),
    //     }))
    //   folders[request.folderId] = folder

    //   if (!folder) {
    //     throw new FolderNotFoundError()
    //   }

    // const metadataLocation =
    //   await this.ormService.db.query.storageLocationsTable.findFirst({
    //     where: eq(storageLocationsTable.id, folder.metadataLocationId),
    //   })

    // if (!metadataLocation) {
    //   throw new StorageLocationNotFoundError()
    // }

    //   const objectKeys = Object.keys(request.).map(
    //     (metadataHash) => {
    //       return {
    //         method: request.metadataHashes[metadataHash].method,
    //         objectKey: `${
    //           metadataLocation.prefix ? metadataLocation.prefix : ''
    //         }${folder.id}/${request.objectKey}/${
    //           request.metadataHashes[metadataHash].metadataHash
    //         }`,
    //       }
    //     },
    //   )
    //   const presignedUrls = this.s3Service.createS3PresignedUrls(
    //     objectKeys.map(({ method, objectKey }) => ({
    //       method,
    //       objectKey,
    //       accessKeyId: metadataLocation.accessKeyId,
    //       secretAccessKey: metadataLocation.secretAccessKey,
    //       bucket: metadataLocation.bucket,
    //       endpoint: metadataLocation.endpoint,
    //       expirySeconds: 86400, // TODO: control this somewhere
    //       region: metadataLocation.region,
    //     })),
    //   )

    //   const signedUrls: { [key: string]: string } = Object.keys(
    //     request.metadataHashes,
    //   ).reduce(
    //     (acc, metadataKey, i) => ({
    //       ...acc,
    //       [metadataKey]: presignedUrls[i],
    //     }),
    //     {},
    //   )

    //   urls.push({
    //     folderId: request.folderId,
    //     objectKey: request.objectKey,
    //     urls: signedUrls,
    //   })
    // }

    return {
      urls,
    }
  }

  async _createSignedUrls(
    signedUrlRequests: {
      method:
        | SignedURLsRequestMethod.GET
        | SignedURLsRequestMethod.PUT
        | SignedURLsRequestMethod.DELETE
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
      [key: string]:
        | { objectKey: string; method: SignedURLsRequestMethod }[]
        | undefined
    }>((acc, next) => {
      return {
        ...acc,
        [next.folderId]: (acc[next.folderId] ?? []).concat([
          { objectKey: next.objectKey, method: next.method },
        ]),
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
        throw new FolderNotFoundError()
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
            folderRequests.map(({ method, objectKey }) => ({
              method,
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
            ...folderRequests[i],
          })),
      )
    }

    return signedUrls.map((signedUrl) => ({
      url: signedUrl.url,
      folderId: signedUrl.folderId,
      objectKey: signedUrl.objectKey,
    }))
  }
}
