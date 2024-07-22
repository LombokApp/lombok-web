import {
  forwardRef,
  HttpException,
  HttpStatus,
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
import { redisConfig } from 'src/cache/redis.config'
import { RedisService } from 'src/cache/redis.service'
import { readDirRecursive } from 'src/core/utils/fs.util'
import { eventReceiptsTable } from 'src/event/entities/event-receipt.entity'
import type { FolderWithoutLocations } from 'src/folders/entities/folder.entity'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { folderObjectsTable } from 'src/folders/entities/folder-object.entity'
import { FolderNotFoundException } from 'src/folders/exceptions/folder-not-found.exception'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import { storageLocationsTable } from 'src/storage/entities/storage-location.entity'
import { S3Service } from 'src/storage/s3.service'
import { createS3PresignedUrls } from 'src/storage/s3.utils'
import type { User } from 'src/users/entities/user.entity'
import { v4 as uuidV4 } from 'uuid'

import { appConfig } from '../config'
import { AppSocketAPIRequest } from '../constants/app-api-messages'
import { appLogEntriesTable } from '../entities/app-log-entry.entity'

const FROM_DISK_APP_TREE_REDIS_KEY = '__STELLARIS_FROM_DISK_APP_TREE'

export type MetadataUploadUrlsResponse = {
  folderId: string
  objectKey: string
  url: string
}[]

const AppLogEntryValidator = r.Record({
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
  _appsCache: {
    apps: InstalledAppDefinitions | undefined
    appAssetCache: { [key: string]: Buffer }
  } = {
    apps: undefined,
    appAssetCache: {},
  }

  constructor(
    @Inject(redisConfig.KEY)
    private readonly _redisConfig: nestJsConfig.ConfigType<typeof redisConfig>,
    @Inject(appConfig.KEY)
    private readonly _appConfig: nestJsConfig.ConfigType<typeof appConfig>,
    private readonly ormService: OrmService,
    private readonly redisService: RedisService,
    @Inject(forwardRef(() => FolderService)) _folderService,
    private readonly s3Service: S3Service,
  ) {
    this.folderService = _folderService
  }

  async getAppAsAdmin(user: User, appIdentifier: string) {
    if (!user.isAdmin) {
      throw new HttpException('Not Found', HttpStatus.NOT_FOUND)
    }

    return this.getApp(appIdentifier)
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
          if (AppLogEntryValidator.guard(requestData)) {
            await this.ormService.db.insert(appLogEntriesTable).values([
              {
                ...requestData,
                createdAt: now,
                updatedAt: now,
                appId: appIdentifier,
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
                  eq(eventReceiptsTable.appIdentifier, appIdentifier),
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
                  eq(eventReceiptsTable.appIdentifier, appIdentifier),
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
                  eq(eventReceiptsTable.appIdentifier, appIdentifier),
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
                    eq(eventReceiptsTable.appIdentifier, appIdentifier),
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
      const folder = await this.ormService.db.query.foldersTable.findFirst(
        {
          where: eq(foldersTable.id, folderId),
        },
        // { populate: ['contentLocation', 'metadataLocation'] },
      )
      if (!folder) {
        throw new FolderNotFoundException()
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

  public async getContentForAppAsset(
    appIdentifier: string,
    appUi: string,
    filename: string,
  ) {
    const CACHE_KEY = this.getCacheKeyForAppAsset(
      appIdentifier,
      appUi,
      filename,
    )
    if (this._redisConfig.enabled) {
      return this.redisService.client.GET(CACHE_KEY)
    } else {
      return this._appsCache.appAssetCache[CACHE_KEY]
    }
  }

  public getCacheKeyForAppAsset(
    appIdentifier: string,
    appUi: string,
    filename: string,
  ) {
    return `APP_UI:${appIdentifier}:${appUi}:${filename}`
  }

  public async updateAppsFromDisk(appsDirectory: string) {
    // load the apps from disk
    const appsFromDisk = this.loadAppsFromDisk(appsDirectory)
    // console.log('Loaded apps from disk:', JSON.stringify(appsFromDisk, null, 2))

    // push all app UI file content into redis
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
            if (this._redisConfig.enabled) {
              await this.redisService.client.SET(
                CACHE_KEY,
                fs.readFileSync(fullFilePath),
              )
            } else {
              this._appsCache.appAssetCache[CACHE_KEY] =
                fs.readFileSync(fullFilePath)
            }
          }
        }
      }
    }

    // save parsed apps in memory
    await this.setAppsInMemory(appsFromDisk)
    return appsFromDisk
  }

  private async setAppsInMemory(
    apps: ReturnType<typeof this.loadAppsFromDisk>,
  ) {
    // save app configs in memory
    if (this._redisConfig.enabled) {
      await this.redisService.client.SET(
        FROM_DISK_APP_TREE_REDIS_KEY,
        JSON.stringify(apps),
      )
    } else {
      this._appsCache.apps = apps
    }
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
    if (this._redisConfig.enabled) {
      const redisContentRaw = await this.redisService.client.GET(
        FROM_DISK_APP_TREE_REDIS_KEY,
      )
      return redisContentRaw ? JSON.parse(redisContentRaw) : undefined
    } else {
      return this._appsCache.apps
    }
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

  async getAppConnections(): Promise<{
    [key: string]: ConnectedAppInstance[]
  }> {
    if (this._redisConfig.enabled) {
      let cursor = 0
      let started = false
      let keys: string[] = []
      while (!started || cursor !== 0) {
        started = true

        const scanResult = await this.redisService.client.scan(cursor, {
          MATCH: 'APP_WORKER:*',
          TYPE: 'string',
          COUNT: 10000,
        })
        keys = keys.concat(scanResult.keys)
        cursor = scanResult.cursor
      }

      return keys.length
        ? (await this.redisService.client.mGet(keys))
            .filter((_r) => _r)
            .reduce<{ [k: string]: ConnectedAppInstance[] }>((acc, _r) => {
              const parsedRecord: ConnectedAppInstance | undefined = _r
                ? JSON.parse(_r)
                : undefined
              if (!parsedRecord) {
                return acc
              }
              return {
                ...acc,
                [parsedRecord.appIdentifier]: (parsedRecord.appIdentifier in acc
                  ? acc[parsedRecord.appIdentifier]
                  : []
                ).concat([parsedRecord]),
              }
            }, {})
        : {}
    } else {
      return {}
    }
  }
}
