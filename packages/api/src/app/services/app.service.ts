import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import nestJsConfig from '@nestjs/config'
import { hashLocalFile } from '@stellariscloud/core-worker'
import type { AppConfig, ConnectedAppWorker } from '@stellariscloud/types'
import { MediaType, SignedURLsRequestMethod } from '@stellariscloud/types'
import { safeZodParse } from '@stellariscloud/utils'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import fs from 'fs'
import mime from 'mime'
import path from 'path'
import { KVService } from 'src/cache/kv.service'
import { readDirRecursive } from 'src/core/utils/fs.util'
import { EventLevel, eventsTable } from 'src/event/entities/event.entity'
import type { FolderWithoutLocations } from 'src/folders/entities/folder.entity'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { folderObjectsTable } from 'src/folders/entities/folder-object.entity'
import { FolderNotFoundException } from 'src/folders/exceptions/folder-not-found.exception'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { uploadLocalFile } from 'src/shared/utils'
import { APP_WORKER_INFO_CACHE_KEY_PREFIX } from 'src/socket/app/app-socket.service'
import { storageLocationsTable } from 'src/storage/entities/storage-location.entity'
import { S3Service } from 'src/storage/s3.service'
import { createS3PresignedUrls } from 'src/storage/s3.utils'
import { tasksTable } from 'src/task/entities/task.entity'
import { v4 as uuidV4 } from 'uuid'
import { z } from 'zod'

import { appConfig } from '../config'
import { AppSocketAPIRequest } from '../constants/app-api-messages'
import { App, appsTable } from '../entities/app.entity'
import { AppAlreadyInstalledException } from '../exceptions/app-already-installed.exception'
import { AppNotParsableException } from '../exceptions/app-not-parsable.exception'
import { AppRequirementsNotSatisfiedException } from '../exceptions/app-requirements-not-satisfied.exception'

const MAX_APP_FILE_SIZE = 1024 * 1024 * 16
const MAX_APP_TOTAL_SIZE = 1024 * 1024 * 32

export const APP_NS_PREFIX = 'app:'

export type MetadataUploadUrlsResponse = {
  folderId: string
  objectKey: string
  url: string
}[]

const LogEntryValidator = z.object({
  name: z.string(),
  message: z.string(),
  level: z.string(),
  locationContext: z
    .object({
      folderId: z.string(),
      objectKey: z.string().optional(),
    })
    .optional(),
  data: z.unknown().optional(),
})

const UpdateAttributesValidator = z.object({
  updates: z.array(
    z.object({
      folderId: z.string(),
      objectKey: z.string(),
      hash: z.string(),
      attributes: z.object({
        mediaType: z.nativeEnum(MediaType),
        mimeType: z.string(),
        height: z.number(),
        width: z.number(),
        orientation: z.number(),
        lengthMs: z.number(),
        bitrate: z.number(),
      }),
    }),
  ),
  eventId: z.string().optional(),
})

const AttemptStartHandleTaskValidator = z.object({
  taskKeys: z.array(z.string()),
})

const GetContentSignedURLsValidator = z.object({
  requests: z.array(
    z.object({
      folderId: z.string(),
      objectKey: z.string(),
      method: z.nativeEnum(SignedURLsRequestMethod),
    }),
  ),
  eventId: z.string().optional(),
})

const GetMetadataSignedURLsValidator = z.object({
  requests: z.array(
    z.object({
      folderId: z.string(),
      objectKey: z.string(),
      contentHash: z.string(),
      method: z.nativeEnum(SignedURLsRequestMethod),
      metadataHash: z.string(),
    }),
  ),
})

const metadataEntrySchema = z.object({
  mimeType: z.string(),
  size: z.number(),
  hash: z.string(),
})

const updateMetadataSchema = z.object({
  updates: z.array(
    z.object({
      folderId: z.string(),
      objectKey: z.string(),
      hash: z.string(),
      metadata: z.record(z.string(), metadataEntrySchema),
    }),
  ),
  eventId: z.string().optional(),
})

const failHandleTaskSchema = z.object({
  taskId: z.string().uuid(),
  error: z.object({
    message: z.string(),
    code: z.string(),
  }),
})

export interface AppDefinition {
  config: AppConfig
  ui: Record<
    string,
    {
      name: string
      files: Record<string, { size: number; hash: string }>
    }
  >
  workers: Record<
    string,
    {
      name: string
      files: Record<string, { size: number; hash: string }>
    }
  >
}

@Injectable()
export class AppService {
  folderService: FolderService
  constructor(
    @Inject(appConfig.KEY)
    private readonly _appConfig: nestJsConfig.ConfigType<typeof appConfig>,
    private readonly ormService: OrmService,
    private readonly serverConfigurationService: ServerConfigurationService,
    private readonly kvService: KVService,
    @Inject(forwardRef(() => FolderService)) _folderService,
    private readonly s3Service: S3Service,
  ) {
    this.folderService = _folderService as FolderService
  }

  getApp(appIdentifier: string): Promise<App | undefined> {
    return this.ormService.db.query.appsTable.findFirst({
      where: eq(appsTable.identifier, appIdentifier),
    })
  }

  async handleAppRequest(
    handlerId: string,
    appIdentifier: string,
    message: unknown,
  ) {
    const now = new Date()
    if (safeZodParse(message, AppSocketAPIRequest)) {
      const requestData = message.data
      const appIdentifierPrefixed = `${APP_NS_PREFIX}${appIdentifier.toUpperCase()}`
      switch (message.name) {
        case 'SAVE_LOG_ENTRY':
          if (safeZodParse(requestData, LogEntryValidator)) {
            await this.ormService.db.insert(eventsTable).values([
              {
                ...requestData,
                createdAt: now,
                level: EventLevel.INFO, // TODO: translate app log level to event level
                emitterIdentifier: appIdentifier,
                eventKey: `${appIdentifierPrefixed}:LOG_ENTRY`,
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
          if (safeZodParse(requestData, GetContentSignedURLsValidator)) {
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
          if (safeZodParse(requestData, GetMetadataSignedURLsValidator)) {
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
          if (safeZodParse(requestData, UpdateAttributesValidator)) {
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
          const parseResult = safeZodParse(requestData, updateMetadataSchema)
          if (parseResult) {
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
          if (safeZodParse(requestData, z.string())) {
            const task = await this.ormService.db.query.tasksTable.findFirst({
              where: and(
                eq(tasksTable.id, requestData),
                eq(tasksTable.ownerIdentifier, appIdentifierPrefixed),
              ),
            })
            if (
              !task ||
              task.completedAt ||
              task.handlerId !== handlerId ||
              !task.startedAt
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
                .where(eq(tasksTable.id, task.id)),
            }
          }
          break
        }
        case 'ATTEMPT_START_HANDLE_TASK': {
          if (safeZodParse(requestData, AttemptStartHandleTaskValidator)) {
            const task = await this.ormService.db.query.tasksTable.findFirst({
              where: and(
                eq(tasksTable.ownerIdentifier, appIdentifierPrefixed),
                inArray(tasksTable.taskKey, requestData.taskKeys),
                isNull(tasksTable.startedAt),
              ),
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
          if (failHandleTaskSchema.safeParse(requestData).success) {
            const parsedFailHandleTaskMessage =
              failHandleTaskSchema.parse(requestData)
            const task = await this.ormService.db.query.tasksTable.findFirst({
              where: and(
                eq(tasksTable.id, parsedFailHandleTaskMessage.taskId),
                eq(tasksTable.ownerIdentifier, appIdentifierPrefixed),
              ),
            })
            if (
              !task?.startedAt ||
              task.completedAt ||
              task.handlerId !== handlerId
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
                    eq(tasksTable.id, task.id),
                    eq(tasksTable.ownerIdentifier, appIdentifierPrefixed),
                  ),
                ),
            }
          } else {
            // eslint-disable-next-line no-console
            console.log(
              'FAIL_HANDLE_TASK error:',
              requestData,
              failHandleTaskSchema.safeParse(requestData).error,
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
    const folders: Record<string, FolderWithoutLocations | undefined> = {}

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
    const presignedUrlRequestsByFolderId = signedUrlRequests.reduce<
      Record<
        string,
        { objectKey: string; method: SignedURLsRequestMethod }[] | undefined
      >
    >((acc, next) => {
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
    return this.kvService.ops.get(CACHE_KEY) as string
  }

  public getCacheKeyForAppAsset(
    appIdentifier: string,
    appUi: string,
    filename: string,
  ) {
    return `APP_UI:${appIdentifier}:${appUi}:${filename}`
  }

  public listApps() {
    return this.ormService.db.query.appsTable.findMany({ limit: 100 })
  }

  public async uninstallApp(app: App) {
    const serverStorageLocation =
      await this.serverConfigurationService.getServerStorageLocation()
    const appRequiresStorage =
      app.config.requiresStorage ||
      app.manifest.filter(
        (manifestItem) =>
          manifestItem.path.startsWith('/ui') ||
          manifestItem.path.startsWith('/workers'),
      ).length

    if (appRequiresStorage && serverStorageLocation) {
      const prefix = `${serverStorageLocation.prefix ? serverStorageLocation.prefix + '/' : ''}app-storage/${app.identifier}/`
      await this.s3Service.deleteAllWithPrefix({
        ...serverStorageLocation,
        prefix,
      })
    }

    // remove app db record
    await this.ormService.db
      .delete(appsTable)
      .where(eq(appsTable.identifier, app.identifier))
  }

  public async installApp(app: App, update = false) {
    const now = new Date()
    const installedApp = await this.getApp(app.identifier)
    if (installedApp && !update) {
      throw new AppAlreadyInstalledException()
    }
    const assetManifestEntries = app.manifest.filter(
      (manifestItem) =>
        manifestItem.path.startsWith('/ui') ||
        manifestItem.path.startsWith('/workers'),
    )

    const serverStorageLocation =
      await this.serverConfigurationService.getServerStorageLocation()
    const appRequiresStorage =
      app.config.requiresStorage || assetManifestEntries.length

    if (appRequiresStorage && !serverStorageLocation) {
      throw new AppRequirementsNotSatisfiedException()
    }

    if (installedApp) {
      // uninstall currently installed app instance
      await this.uninstallApp(app)
    }

    if (serverStorageLocation) {
      for (const manifestEntry of assetManifestEntries) {
        const fullFilepath = path.join(
          this._appConfig.appsLocalPath,
          app.identifier,
          manifestEntry.path,
        )
        const objectKey = `${serverStorageLocation.prefix ? serverStorageLocation.prefix + '/' : ''}app-storage/${app.identifier}${manifestEntry.path}`
        // eslint-disable-next-line no-console
        console.log('Uploading app file:', {
          objectKey,
          filepath: manifestEntry.path,
          fullFilepath,
        })

        const [url] = this.s3Service.createS3PresignedUrls([
          {
            ...serverStorageLocation,
            method: SignedURLsRequestMethod.PUT,
            expirySeconds: 600,
            objectKey,
          },
        ])

        await uploadLocalFile(
          fullFilepath,
          url,
          mime.getType(manifestEntry.path) ?? undefined,
        )
      }
    }

    // update app db record to match new app
    if (installedApp) {
      await this.ormService.db
        .update(appsTable)
        .set({ ...app, createdAt: installedApp.createdAt, updatedAt: now })
        .where(eq(appsTable.identifier, installedApp.identifier))
    } else {
      await this.ormService.db.insert(appsTable).values({
        ...app,
        createdAt: now,
        updatedAt: now,
      })
    }
  }

  public async installAllAppsFromDisk() {
    // get potential app identifier from the directory structure
    const allPotentialAppDirectoriesEntries =
      this.getAllPotentialAppDirectories(this._appConfig.appsLocalPath)

    // for each potential app, attempt to install it (without updating if its already installed)
    for (const appIdentifier of allPotentialAppDirectoriesEntries) {
      await this.attemptParseAndInstallAppFromDisk(appIdentifier, false)
    }
  }

  public async attemptParseAndInstallAppFromDisk(
    appIdentifier: string,
    update: boolean,
  ) {
    const app = await this.parseAppFromDisk(appIdentifier)

    if (app.valid) {
      try {
        await this.installApp(app.definition, update)
      } catch (error) {
        if (error instanceof AppAlreadyInstalledException) {
          // eslint-disable-next-line no-console
          console.log(
            `APP INSTALL ERROR - APP[${appIdentifier}]: App is already installed.`,
          )
        } else if (error instanceof AppNotParsableException) {
          // eslint-disable-next-line no-console
          console.log(
            `APP INSTALL ERROR - APP[${appIdentifier}]: App is not parsable.`,
          )
        } else if (error instanceof AppRequirementsNotSatisfiedException) {
          // eslint-disable-next-line no-console
          console.log(
            `APP INSTALL ERROR - APP[${appIdentifier}]: App requirements are not met.`,
          )
        } else {
          // eslint-disable-next-line no-console
          console.log(`APP INSTALL ERROR - APP[${appIdentifier}]:`, error)
        }
      }
    } else {
      // eslint-disable-next-line no-console
      console.log(`APP PARSE ERROR - APP[${appIdentifier}]: DEFINITION_INVALID`)
    }
  }

  public getAllPotentialAppDirectories = (appsDirectoryPath: string) => {
    if (!fs.existsSync(appsDirectoryPath)) {
      console.log('Apps directory "%s" not found.', appsDirectoryPath)
      return []
    }
    return fs
      .readdirSync(appsDirectoryPath)
      .filter((appIdentifier) =>
        fs.lstatSync(path.join(appsDirectoryPath, appIdentifier)).isDirectory(),
      )
  }

  public async parseAppFromDisk(
    appIdentifier: string,
  ): Promise<{ definition: App; valid: boolean }> {
    const now = new Date()

    let currentTotalSize = 0
    const publicKeyPath = path.join(
      this._appConfig.appsLocalPath,
      appIdentifier,
      '.publicKey',
    )
    const configPath = path.join(
      this._appConfig.appsLocalPath,
      appIdentifier,
      'config.json',
    )
    const publicKey =
      fs.existsSync(publicKeyPath) && !fs.lstatSync(publicKeyPath).isDirectory()
        ? fs.readFileSync(publicKeyPath, 'utf-8')
        : ''

    const config = fs.existsSync(configPath)
      ? (JSON.parse(fs.readFileSync(configPath, 'utf-8')) as AppConfig)
      : undefined

    if (!config) {
      throw new Error(`Config file not found when parsing app.`)
    }

    // console.log('READ APP CONFIG', { config, configPath, publicKeyPath, publicKey })
    const appRoot = path.join(this._appConfig.appsLocalPath, appIdentifier)
    const manifest = await Promise.all(
      readDirRecursive(appRoot).map(async (absoluteAssetPath) => {
        const size = fs.statSync(absoluteAssetPath).size
        if (size > MAX_APP_FILE_SIZE) {
          throw new Error(`App file too large! MAX: ${MAX_APP_FILE_SIZE}`)
        }
        currentTotalSize += size
        if (currentTotalSize > MAX_APP_TOTAL_SIZE) {
          throw new Error(
            `Total app files size is too large! MAX: ${MAX_APP_TOTAL_SIZE}`,
          )
        }
        const relativeAssetPath = absoluteAssetPath.slice(appRoot.length)

        return {
          size: fs.statSync(absoluteAssetPath).size,
          path: relativeAssetPath,
          hash: await hashLocalFile(absoluteAssetPath),
        }
      }),
    )
    // TODO: Validate app definition
    const app = {
      valid: true,
      definition: {
        identifier: appIdentifier,
        manifest,
        publicKey,
        config,
        createdAt: now,
        updatedAt: now,
        contentHash: '', // TODO: calculate the exact content hash
        enabled: false,
      },
    }
    return app
  }

  getAppConnections(): Record<string, ConnectedAppWorker[]> {
    let cursor = 0
    let started = false
    let keys: string[] = []
    while (!started || cursor !== 0) {
      started = true

      const scanResult = this.kvService.ops.scan(
        cursor,
        `${APP_WORKER_INFO_CACHE_KEY_PREFIX}:*`,
        10000,
      )
      cursor = scanResult[0]
      keys = keys.concat(scanResult[1])
    }

    const result = keys.length
      ? this.kvService.ops
          .mget(...keys)
          .filter((_r) => _r)
          .reduce<Record<string, ConnectedAppWorker[]>>(
            (acc, _r: string | undefined) => {
              const parsed = JSON.parse(
                _r ?? 'null',
              ) as ConnectedAppWorker | null
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
    return result
  }
}
