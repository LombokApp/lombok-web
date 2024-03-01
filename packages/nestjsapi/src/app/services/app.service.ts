import {
  HttpException,
  HttpStatus,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import type { ModuleConfig } from '@stellariscloud/types'
import { MediaType } from '@stellariscloud/types'
import { EnumType } from '@stellariscloud/utils'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'
import * as r from 'runtypes'
import { v4 as uuidV4 } from 'uuid'

import { RedisService } from '../../core/services/redis.service'
import { S3Service } from '../../core/services/s3.service'
import { SocketService } from '../../core/services/socket.service'
import { readDirRecursive } from '../../core/utils/fs.util'
import { eventReceiptsTable } from '../../event/entities/event-receipt.entity'
import type { FolderWithoutLocations } from '../../folders/entities/folder.entity'
import { foldersTable } from '../../folders/entities/folder.entity'
import { folderObjectsTable } from '../../folders/entities/folder-object.entity'
import { FolderNotFoundError } from '../../folders/errors/folder.error'
import {
  FolderService,
  SignedURLsRequestMethod,
} from '../../folders/services/folders.service'
import { locationsTable } from '../../locations/entities/locations.entity'
import { OrmService } from '../../orm/orm.service'
import type { User } from '../../users/entities/user.entity'
import { ModuleSocketAPIRequest } from '../constants/app-api-messages'
import { moduleLogEntriesTable } from '../entities/app-log-entry.entity'

const FROM_DISK_MODULE_TREE_REDIS_KEY = '__STELLARIS_FROM_DISK_MODULE_TREE'

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

@Injectable()
export class AppService {
  constructor(
    private readonly ormService: OrmService,
    private readonly redisService: RedisService,
    private readonly s3Service: S3Service,
    private readonly socketService: SocketService,
    private readonly folderService: FolderService,
  ) {}

  _modulesFromDisk: { [key: string]: { config: ModuleConfig } } = {}

  async listModulesAsAdmin(user: User) {
    if (!user.isAdmin) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND)
    }
    const connectedModuleInstances =
      await this.socketService.getModuleConnections()
    return {
      connected: connectedModuleInstances,
      installed: await this.listModules(),
    }
  }

  async listModules() {
    const modulesFromDiskRaw = await this.redisService.client.GET(
      FROM_DISK_MODULE_TREE_REDIS_KEY,
    )
    const modulesFromDisk: ReturnType<typeof this.loadModulesFromDisk> =
      modulesFromDiskRaw ? JSON.parse(modulesFromDiskRaw) : {}

    return Object.keys(modulesFromDisk).map((moduleName) => {
      const module = modulesFromDisk[moduleName]
      return {
        identifier: moduleName,
        config: module.config,
      }
    })
  }

  async getModuleAsAdmin(user: User, moduleName: string) {
    if (!user.isAdmin) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND)
    }

    return this.getModule(moduleName)
  }

  async getModule(moduleName: string): Promise<ModuleConfig | undefined> {
    const modulesFromDiskRaw = await this.redisService.client.GET(
      FROM_DISK_MODULE_TREE_REDIS_KEY,
    )
    const modulesFromDisk: ReturnType<typeof this.loadModulesFromDisk> =
      modulesFromDiskRaw ? JSON.parse(modulesFromDiskRaw) : {}

    return moduleName in modulesFromDisk
      ? modulesFromDisk[moduleName].config
      : undefined
  }

  async handleModuleRequest(
    handlerId: string,
    moduleName: string,
    message: any,
  ) {
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
                moduleId: moduleName,
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
                  eq(eventReceiptsTable.moduleIdentifier, moduleName),
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
                  eq(eventReceiptsTable.moduleIdentifier, moduleName),
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
                  eq(eventReceiptsTable.moduleIdentifier, moduleName),
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
                .where(
                  and(
                    eq(eventReceiptsTable.id, eventReceipt.id),
                    eq(eventReceiptsTable.moduleIdentifier, moduleName),
                  ),
                ),
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
    this.socketService.notifyAppWorkersOfPendingEvents(
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
                where: eq(locationsTable.id, folder.metadataLocationId),
              })

            if (!metadataLocation) {
              throw new NotFoundException(
                undefined,
                `Storage location not found by id "${folder.metadataLocationId}"`,
              )
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
          where: eq(locationsTable.id, folder.metadataLocationId),
        })

      if (!contentLocation) {
        throw new NotFoundException(
          undefined,
          `Storage location not found by id "${folder.metadataLocationId}"`,
        )
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

  public async updateModulesFromDisk(modulesDirectory: string) {
    console.log('Refreshing modules from disk...')

    // load the modules from disk
    const modulesFromDisk = this.loadModulesFromDisk(modulesDirectory)
    console.log(
      'Loaded modules from disk:',
      JSON.stringify(modulesFromDisk, null, 2),
    )

    // push all module UI file content into redis
    for (const module of Object.keys(modulesFromDisk)) {
      for (const moduleUi of Object.keys(modulesFromDisk[module].ui)) {
        for (const filename of Object.keys(
          modulesFromDisk[module].ui[moduleUi].files,
        )) {
          const fullFilePath = path.join(
            modulesDirectory,
            module,
            'ui',
            moduleUi,
            filename,
          )
          const REDIS_KEY = `MODULE_UI:${module}:${moduleUi}:${filename}`
          await this.redisService.client.SET(
            REDIS_KEY,
            fs.readFileSync(fullFilePath),
          )
        }
      }
    }

    // push module config tree into redis
    await this.redisService.client.SET(
      FROM_DISK_MODULE_TREE_REDIS_KEY,
      JSON.stringify(modulesFromDisk),
    )
  }

  public loadModulesFromDisk(modulesDirectory: string) {
    const configs: {
      [key: string]: {
        config: ModuleConfig
        ui: {
          [key: string]: {
            path: string
            name: string
            files: { [key: string]: { size: number; hash: string } }
          }
        }
      }
    } = {}

    for (const moduleName of fs.readdirSync(modulesDirectory)) {
      const parentPath = path.join(modulesDirectory, moduleName)
      const configPath = path.join(modulesDirectory, moduleName, 'config.json')
      const uiDirPath = path.join(modulesDirectory, moduleName, 'ui')
      if (!fs.lstatSync(parentPath).isDirectory()) {
        continue
      }

      if (fs.existsSync(configPath)) {
        const configJson = fs.readFileSync(configPath, 'utf-8')
        configs[moduleName] = { ui: {}, config: JSON.parse(configJson) }
        // load all the frontend assets provided by the module
        if (fs.existsSync(uiDirPath) && fs.lstatSync(uiDirPath).isDirectory()) {
          for (const uiName of fs.readdirSync(uiDirPath)) {
            const uiPayloadRoot = path.join(uiDirPath, uiName)
            if (fs.lstatSync(uiPayloadRoot).isDirectory()) {
              const uiPath = path.join(uiDirPath, uiName)
              const moduleUiPath = path.join(uiDirPath, uiName)
              configs[moduleName].ui[uiName] = {
                name: uiName,
                path: uiPath,
                files: readDirRecursive(moduleUiPath).reduce(
                  (acc, entryPath) => ({
                    ...acc,
                    [entryPath.slice(moduleUiPath.length)]: {
                      hash: '',
                      size: 1,
                    },
                  }),
                  {},
                ),
              }
            }
          }
        }
      }
    }
    return configs
  }
}
