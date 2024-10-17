import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import nestJsConfig from '@nestjs/config'
import type { AppConfig, ConnectedAppInstance } from '@stellariscloud/types'
import { MediaType, SignedURLsRequestMethod } from '@stellariscloud/types'
import { EnumType } from '@stellariscloud/utils'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import fs from 'fs'
import path from 'path'
import * as r from 'runtypes'
import { KVService } from 'src/cache/kv.service'
import { readDirRecursive } from 'src/core/utils/fs.util'
import { eventsTable } from 'src/event/entities/event.entity'
import type { FolderWithoutLocations } from 'src/folders/entities/folder.entity'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { folderObjectsTable } from 'src/folders/entities/folder-object.entity'
import { FolderNotFoundException } from 'src/folders/exceptions/folder-not-found.exception'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import { storageLocationsTable } from 'src/storage/entities/storage-location.entity'
import { S3Service } from 'src/storage/s3.service'
import { createS3PresignedUrls } from 'src/storage/s3.utils'
import { tasksTable } from 'src/task/entities/task.entity'
import { v4 as uuidV4 } from 'uuid'
import { z } from 'zod'

import { appConfig } from '../config'
import { AppSocketAPIRequest } from '../constants/app-api-messages'

const FROM_DISK_APP_TREE_CACHE_KEY = '__STELLARIS_FROM_DISK_APP_TREE'

export type MetadataUploadUrlsResponse = {
  folderId: string
  objectKey: string
  url: string
}[]

const LogEntryValidator = r.Record({
  name: r.String,
  message: r.String,
  level: r.String,
  locationContext: r
    .Record({
      folderId: r.String,
      objectKey: r.String.optional(),
    })
    .optional(),
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

const AttemptStartHandleTaskValidator = r.Record({
  taskKeys: r.Array(r.String),
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

const FailHandleTaskValidator = z.object({
  eventReceiptId: z.string(),
  error: z.object({
    message: z.string(),
    code: z.string(),
  }),
})

interface InstalledAppDefinitions {
  [key: string]:
    | {
        config: AppConfig
        ui: {
          [key: string]: {
            path: string
            name: string
            files: { [key: string]: { size: number; hash: string } }
          }
        }
      }
    | undefined
}

@Injectable()
export class AppService {
  folderService: FolderService
  constructor(
    @Inject(appConfig.KEY)
    private readonly _appConfig: nestJsConfig.ConfigType<typeof appConfig>,
    private readonly ormService: OrmService,
    private readonly kvService: KVService,
    @Inject(forwardRef(() => FolderService)) _folderService,
    private readonly s3Service: S3Service,
  ) {
    this.folderService = _folderService
  }

  async getApp(appIdentifier: string): Promise<AppConfig | undefined> {
    const installedApps = await this.getApps()
    return appIdentifier in installedApps
      ? installedApps[appIdentifier]?.config
      : undefined
  }

  async handleAppRequest(
    handlerId: string,
    appIdentifier: string,
    message: any,
  ) {
    const now = new Date()
    if (AppSocketAPIRequest.guard(message)) {
      const requestData = message.data
      switch (message.name) {
        case 'SAVE_LOG_ENTRY':
          if (LogEntryValidator.guard(requestData)) {
            await this.ormService.db.insert(eventsTable).values([
              {
                ...requestData,
                createdAt: now,
                emitterIdentifier: appIdentifier,
                eventKey: `${appIdentifier.toUpperCase()}:LOG_ENTRY`,
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
        case 'COMPLETE_HANDLE_TASK': {
          if (r.String.guard(requestData)) {
            const eventReceipt =
              await this.ormService.db.query.tasksTable.findFirst({
                where: and(
                  eq(tasksTable.id, requestData),
                  eq(tasksTable.ownerIdentifier, appIdentifier),
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
                .update(tasksTable)
                .set({ completedAt: new Date() })
                .where(eq(tasksTable.id, eventReceipt.id)),
            }
          }
          break
        }
        case 'ATTEMPT_START_HANDLE_TASK': {
          if (AttemptStartHandleTaskValidator.guard(requestData)) {
            const task = await this.ormService.db.query.tasksTable.findFirst({
              where: and(
                eq(tasksTable.ownerIdentifier, appIdentifier),
                inArray(tasksTable.taskKey, requestData.taskKeys),
                isNull(tasksTable.startedAt),
              ),
              with: {
                event: true,
              },
            })
            if (!task || task.completedAt || task.handlerId || task.startedAt) {
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
                    .update(tasksTable)
                    .set({ startedAt: new Date(), handlerId })
                    .where(eq(tasksTable.id, task.id))
                    .returning()
                )[0],
                data: {
                  folderId: task.subjectFolderId,
                  objectKey: task.subjectObjectKey,
                },
              },
            }
          }
          break
        }
        case 'FAIL_HANDLE_TASK': {
          if (FailHandleTaskValidator.safeParse(requestData).success) {
            const parsedFailHandleTaskMessage =
              FailHandleTaskValidator.parse(requestData)
            const eventReceipt =
              await this.ormService.db.query.tasksTable.findFirst({
                where: and(
                  eq(tasksTable.id, parsedFailHandleTaskMessage.eventReceiptId),
                  eq(tasksTable.ownerIdentifier, appIdentifier),
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
                .update(tasksTable)
                .set({
                  errorCode: parsedFailHandleTaskMessage.error.code,
                  errorMessage: parsedFailHandleTaskMessage.error.message,
                  errorAt: new Date(),
                })
                .where(
                  and(
                    eq(tasksTable.id, eventReceipt.id),
                    eq(tasksTable.ownerIdentifier, appIdentifier),
                  ),
                ),
            }
          } else {
            console.log(
              'FAIL_HANDLE_TASK error:',
              FailHandleTaskValidator.safeParse(requestData).error,
            )
            return {
              result: undefined,
              error: {
                code: 400,
                message: 'Malformed FAIL_HANDLE_TASK request.',
              },
            }
          }
          break
        }
      }
      return {
        result: undefined,
        error: {
          code: 400,
          message: 'Request unrecognized or malformed.',
        },
      }
    }
  }

  async createSignedContentUrls(payload: {
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

    const urls: MetadataUploadUrlsResponse = createS3PresignedUrls(
      await Promise.all(
        payload.requests.map(async (request) => {
          const folder =
            folders[request.folderId] ??
            (await this.ormService.db.query.foldersTable.findFirst({
              where: eq(folderObjectsTable.id, request.folderId),
            }))
          folders[request.folderId] = folder

          if (!folder) {
            throw new FolderNotFoundException()
          }

          const metadataLocation =
            await this.ormService.db.query.storageLocationsTable.findFirst({
              where: eq(storageLocationsTable.id, folder.metadataLocationId),
            })

          if (!metadataLocation) {
            throw new NotFoundException(
              undefined,
              `Storage location not found by id "${folder.metadataLocationId}"`,
            )
          }
          return {
            method: request.method,
            objectKey: `${metadataLocation.prefix}${
              metadataLocation.prefix && !metadataLocation.prefix.endsWith('/')
                ? '/'
                : ''
            }${request.objectKey}/${request.metadataHash}`,
            accessKeyId: metadataLocation.accessKeyId,
            secretAccessKey: metadataLocation.secretAccessKey,
            bucket: metadataLocation.bucket,
            endpoint: metadataLocation.endpoint,
            expirySeconds: 86400, // TODO: control this somewhere
            region: metadataLocation.region,
          }
        }),
      ),
    ).map((_url, i) => {
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
    //   await this.ormService.db.query.locationsTable.findFirst({
    //     where: eq(locationsTable.id, folder.metadataLocationId),
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
      const folderRequests = presignedUrlRequestsByFolderId[folderId]

      if (!folderRequests) {
        continue
      }

      signedUrls = signedUrls.concat(
        this.s3Service
          .createS3PresignedUrls(
            folderRequests.map(({ method, objectKey }) => ({
              method,
              objectKey: `${folder.contentLocation.prefix}${!folder.contentLocation.prefix || folder.contentLocation.prefix.endsWith('/') ? '' : '/'}${objectKey}`,
              accessKeyId: folder.contentLocation.accessKeyId,
              secretAccessKey: folder.contentLocation.secretAccessKey,
              bucket: folder.contentLocation.bucket,
              endpoint: folder.contentLocation.endpoint,
              expirySeconds: 3600,
              region: folder.contentLocation.region,
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

  public getContentForAppAsset(
    appIdentifier: string,
    appUi: string,
    filename: string,
  ) {
    const CACHE_KEY = this.getCacheKeyForAppAsset(
      appIdentifier,
      appUi,
      filename,
    )
    return this.kvService.ops.get(CACHE_KEY)
  }

  public getCacheKeyForAppAsset(
    appIdentifier: string,
    appUi: string,
    filename: string,
  ) {
    return `APP_UI:${appIdentifier}:${appUi}:${filename}`
  }

  public updateAppsFromDisk(appsDirectory: string) {
    // load the apps from disk
    const appsFromDisk = this.loadAppsFromDisk(appsDirectory)
    // push all app UI file content into the cache
    for (const appIdentifier of Object.keys(appsFromDisk)) {
      if (appIdentifier in appsFromDisk) {
        for (const appUi of Object.keys(
          appsFromDisk[appIdentifier]?.ui ?? {},
        )) {
          for (const filename of Object.keys(
            appsFromDisk[appIdentifier]?.ui[appUi]?.files ?? {},
          )) {
            const fullFilePath = path.join(
              appsDirectory,
              appIdentifier,
              'ui',
              appUi,
              filename,
            )
            const CACHE_KEY = `APP_UI:${appIdentifier}:${appUi}:${filename}`
            this.kvService.ops.set(CACHE_KEY, fs.readFileSync(fullFilePath))
          }
        }
      }
    }

    // save parsed apps in memory
    this.setAppsInMemory(appsFromDisk)
    return appsFromDisk
  }

  private setAppsInMemory(apps: ReturnType<typeof this.loadAppsFromDisk>) {
    // save app configs in memory
    this.kvService.ops.set(FROM_DISK_APP_TREE_CACHE_KEY, apps)
  }

  public async getApps() {
    // get latest configs from memory
    const inMemoryApps = await this.getAppsInMemory()

    if (typeof inMemoryApps !== 'object') {
      // load from disk and update in memory reference
      return this.updateAppsFromDisk(this._appConfig.appsLocalPath)
    }
    return inMemoryApps
  }

  public async getAppsInMemory(): Promise<InstalledAppDefinitions | undefined> {
    // get latest configs from memory
    const cacheContent: InstalledAppDefinitions | undefined =
      await this.kvService.ops.get(FROM_DISK_APP_TREE_CACHE_KEY)
    return cacheContent
  }

  public loadAppsFromDisk(appsDirectory: string) {
    const configs: InstalledAppDefinitions = {}

    for (const appName of fs.readdirSync(appsDirectory)) {
      const parentPath = path.join(appsDirectory, appName)
      const configPath = path.join(appsDirectory, appName, 'config.json')
      const uiDirPath = path.join(appsDirectory, appName, 'ui')
      if (!fs.lstatSync(parentPath).isDirectory()) {
        continue
      }

      if (fs.existsSync(configPath)) {
        const configJson = fs.readFileSync(configPath, 'utf-8')
        configs[appName] = { ui: {}, config: JSON.parse(configJson) }
        // load all the frontend assets provided by the app
        if (fs.existsSync(uiDirPath) && fs.lstatSync(uiDirPath).isDirectory()) {
          for (const uiName of fs.readdirSync(uiDirPath)) {
            const uiPayloadRoot = path.join(uiDirPath, uiName)
            if (fs.lstatSync(uiPayloadRoot).isDirectory()) {
              const uiPath = path.join(uiDirPath, uiName)
              const appUiPath = path.join(uiDirPath, uiName)
              const conf = configs[appName]
              if (conf) {
                conf.ui[uiName] = {
                  name: uiName,
                  path: uiPath,
                  files: readDirRecursive(appUiPath).reduce(
                    (acc, entryPath) => ({
                      ...acc,
                      [entryPath.slice(appUiPath.length)]: {
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
    }
    return configs
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async getAppConnections(): Promise<{
    [key: string]: ConnectedAppInstance[]
  }> {
    let cursor = 0
    let started = false
    let keys: string[] = []
    while (!started || cursor !== 0) {
      started = true

      const scanResult = this.kvService.ops.scan(cursor, 'APP_WORKER:*', 10000)
      cursor = scanResult[0]
      keys = keys.concat(scanResult[1])
    }

    const result = keys.length
      ? this.kvService.ops
          .mget(...keys)
          .filter((_r) => _r)
          .reduce<{ [k: string]: ConnectedAppInstance[] }>(
            (acc, _r: string | undefined) => {
              const parsed = JSON.parse(_r ?? 'null')
              if (!parsed) {
                return acc
              }
              return {
                ...acc,
                [parsed.appIdentifier]: (parsed.appIdentifier in acc
                  ? acc[parsed.appIdentifier]
                  : []
                ).concat([parsed]),
              }
            },
            {},
          )
      : {}

    console.log('getAppConnections result', result)
    return result
  }
}
