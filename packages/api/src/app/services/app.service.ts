import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import nestJsConfig from '@nestjs/config'
import { hashLocalFile } from '@stellariscloud/core-worker'
import type {
  AppConfig,
  AppManifest,
  AppUIMap,
  AppWorkerScriptMap,
  ExternalAppWorker,
} from '@stellariscloud/types'
import {
  appConfigSchema,
  metadataEntrySchema,
  SignedURLsRequestMethod,
} from '@stellariscloud/types'
import { safeZodParse } from '@stellariscloud/utils'
import { spawn } from 'bun'
import { and, eq, inArray, isNull } from 'drizzle-orm'
import fs from 'fs'
import fsPromises from 'fs/promises'
import mime from 'mime'
import os from 'os'
import path from 'path'
import { JWTService } from 'src/auth/services/jwt.service'
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
import { uploadFile } from 'src/shared/utils'
import { APP_WORKER_INFO_CACHE_KEY_PREFIX } from 'src/socket/app/app-socket.service'
import { storageLocationsTable } from 'src/storage/entities/storage-location.entity'
import { S3Service } from 'src/storage/s3.service'
import { createS3PresignedUrls } from 'src/storage/s3.utils'
import { Task, tasksTable } from 'src/task/entities/task.entity'
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

const logEntrySchema = z.object({
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

const attemptStartHandleTaskSchema = z.object({
  taskKeys: z.array(z.string()),
})

const attemptStartHandleTaskByIdSchema = z.object({
  taskId: z.string().uuid(),
})

const getWorkerExecutionDetailsSchema = z.object({
  appIdentifier: z.string(),
  workerIdentifier: z.string(),
})

const getAppUIbundleSchema = z.object({
  appIdentifier: z.string(),
  uiName: z.string(),
})

const getContentSignedUrlsSchema = z.object({
  requests: z.array(
    z.object({
      folderId: z.string(),
      objectKey: z.string(),
      method: z.nativeEnum(SignedURLsRequestMethod),
    }),
  ),
  eventId: z.string().optional(),
})

const getMetadataSignedUrlsSchema = z.object({
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

export const updateMetadataSchema = z.object({
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
  workersScripts: Record<
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
    private readonly jwtService: JWTService,
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
    requestingAppIdentifier: string,
    message: unknown,
  ) {
    const now = new Date()
    if (safeZodParse(message, AppSocketAPIRequest)) {
      const requestData = message.data
      const appIdentifierPrefixed = `${APP_NS_PREFIX}${requestingAppIdentifier.toLowerCase()}`
      const isCoreApp = appIdentifierPrefixed === `${APP_NS_PREFIX}core`
      switch (message.name) {
        case 'SAVE_LOG_ENTRY':
          if (safeZodParse(requestData, logEntrySchema)) {
            await this.ormService.db.insert(eventsTable).values([
              {
                ...requestData,
                createdAt: now,
                level: EventLevel.INFO, // TODO: translate app log level to event level
                emitterIdentifier: requestingAppIdentifier,
                eventKey: `${appIdentifierPrefixed}:LOG_ENTRY`,
                id: uuidV4(),
              },
            ])
            return {
              result: undefined,
            }
          }
          return {
            error: {
              code: 400,
              message: 'Invalid request.',
              details: logEntrySchema.safeParse(requestData).error,
            },
          }

        case 'GET_CONTENT_SIGNED_URLS': {
          if (safeZodParse(requestData, getContentSignedUrlsSchema)) {
            return { result: await this.createSignedContentUrls(requestData) }
          } else {
            return {
              error: {
                code: 400,
                message: 'Invalid request.',
                details:
                  getContentSignedUrlsSchema.safeParse(requestData).error,
              },
            }
          }
        }
        case 'GET_METADATA_SIGNED_URLS': {
          if (safeZodParse(requestData, getMetadataSignedUrlsSchema)) {
            return {
              result: await this.createSignedMetadataUrls(requestData),
            }
          } else {
            return {
              error: {
                code: 400,
                message: 'Invalid request.',
                details:
                  getMetadataSignedUrlsSchema.safeParse(requestData).error,
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
                details: updateMetadataSchema.safeParse(requestData).error,
              },
            }
          }
        }
        case 'COMPLETE_HANDLE_TASK': {
          if (safeZodParse(requestData, z.string())) {
            const task = await this.ormService.db.query.tasksTable.findFirst({
              where: isCoreApp
                ? eq(tasksTable.id, requestData)
                : and(
                    eq(tasksTable.id, requestData),
                    isNull(tasksTable.workerIdentifier),
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
                  details: z.string().safeParse(requestData).error,
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
          if (safeZodParse(requestData, attemptStartHandleTaskSchema)) {
            let securedTask: Task | undefined = undefined
            for (let attempt = 0; attempt < 5; attempt++) {
              const task = await this.ormService.db.query.tasksTable.findFirst({
                where: and(
                  eq(tasksTable.ownerIdentifier, appIdentifierPrefixed),
                  inArray(tasksTable.taskKey, requestData.taskKeys),
                  isNull(tasksTable.startedAt),
                ),
              })
              if (
                !task ||
                task.completedAt ||
                task.handlerId ||
                task.startedAt
              ) {
                // No available task, break early
                break
              }
              // Try to secure the task
              securedTask = (
                await this.ormService.db
                  .update(tasksTable)
                  .set({ startedAt: new Date(), handlerId })
                  .where(
                    and(
                      eq(tasksTable.id, task.id),
                      isNull(tasksTable.startedAt),
                    ),
                  )
                  .returning()
              )[0]
              // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
              if (securedTask) {
                break
              }
              // If not secured, loop again to try next available task
            }
            if (!securedTask) {
              // If we are finding tasks but not able to secure one after n retries, return a 409
              return {
                result: undefined,
                error: {
                  code: 409,
                  message:
                    'Task already started by another handler after 5 attempts.',
                },
              }
            }
            return {
              result: securedTask,
            }
          }
          return {
            error: {
              code: 400,
              message: 'Invalid request.',
              details:
                attemptStartHandleTaskSchema.safeParse(requestData).error,
            },
          }
        }
        case 'ATTEMPT_START_HANDLE_TASK_BY_ID': {
          if (safeZodParse(requestData, attemptStartHandleTaskByIdSchema)) {
            const task = await this.ormService.db.query.tasksTable.findFirst({
              where: eq(tasksTable.id, requestData.taskId),
            })

            if (
              !task ||
              (task.workerIdentifier && !isCoreApp) ||
              (isCoreApp &&
                !task.workerIdentifier &&
                task.ownerIdentifier !== appIdentifierPrefixed)
            ) {
              return {
                result: undefined,
                error: {
                  code: 400,
                  message: 'Invalid request (no task found by id).',
                },
              }
            } else if (task.startedAt || task.completedAt || task.handlerId) {
              return {
                result: undefined,
                error: {
                  code: 400,
                  message: 'Task already started.',
                },
              }
            }

            return {
              result: (
                await this.ormService.db
                  .update(tasksTable)
                  .set({ startedAt: new Date(), handlerId })
                  .where(eq(tasksTable.id, task.id))
                  .returning()
              )[0],
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
        }
        case 'GET_APP_UI_BUNDLE': {
          if (safeZodParse(requestData, getAppUIbundleSchema)) {
            return {
              result: await this.getAppUIbundle(
                requestingAppIdentifier,
                requestData,
              ),
            }
          }
          return {
            result: undefined,
            error: {
              code: 400,
              message: 'Malformed GET_APP_UI_BUNDLE request.',
            },
          }
        }
        case 'GET_WORKER_EXECUTION_DETAILS': {
          if (safeZodParse(requestData, getWorkerExecutionDetailsSchema)) {
            // verify the app is the installed "core" app, and that the specified worker payload exists and is specified in the config
            if (requestingAppIdentifier !== 'core') {
              // must be "core" app to access app worker payloads
              return {
                result: undefined,
                error: {
                  code: 403,
                  message: 'Unauthorized.',
                },
              }
            }

            const workerApp = await this.getApp(requestData.appIdentifier)
            if (!workerApp) {
              // app by appIdentifier not found
              return {
                result: undefined,
                error: {
                  code: 404,
                  message: 'Worker app not found.',
                },
              }
            }

            if (!(requestData.workerIdentifier in workerApp.workerScripts)) {
              // worker by workerIdentifier not found in app by appIdentifier
              return {
                result: undefined,
                error: {
                  code: 404,
                  message: 'Worker not found.',
                },
              }
            }

            const serverStorageLocation =
              await this.serverConfigurationService.getServerStorageLocation()

            if (!serverStorageLocation) {
              return {
                result: undefined,
                error: {
                  code: 500,
                  message: 'Server storage location not available.',
                },
              }
            }
            const presignedGetURL = this.s3Service.createS3PresignedUrls([
              {
                method: SignedURLsRequestMethod.GET,
                objectKey: `${serverStorageLocation.prefix ? serverStorageLocation.prefix + '/' : ''}${requestData.appIdentifier}/workers/${requestData.workerIdentifier}.zip`,
                accessKeyId: serverStorageLocation.accessKeyId,
                secretAccessKey: serverStorageLocation.secretAccessKey,
                bucket: serverStorageLocation.bucket,
                endpoint: serverStorageLocation.endpoint,
                expirySeconds: 3600,
                region: serverStorageLocation.region,
              },
            ])
            return {
              result: {
                payloadUrl: presignedGetURL[0],
                envVars:
                  workerApp.workerScripts[requestData.workerIdentifier].envVars,
                workerToken: await this.jwtService.createAppWorkerToken(
                  requestData.appIdentifier,
                ),
              },
            }
          } else {
            // eslint-disable-next-line no-console
            console.log(
              'GET_WORKER_EXECUTION_DETAILS error:',
              requestData,
              getWorkerExecutionDetailsSchema.safeParse(requestData).error,
            )
            return {
              result: undefined,
              error: {
                code: 400,
                message: 'Malformed GET_WORKER_EXECUTION_DETAILS request.',
              },
            }
          }
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

  async getAppUIbundle(
    requestingAppIdentifier: string,
    requestData: { appIdentifier: string; uiName: string },
  ) {
    // verify the app is the installed "core" app
    if (requestingAppIdentifier !== 'core') {
      // must be "core" app to access app UI bundles
      return {
        result: undefined,
        error: {
          code: 403,
          message: 'Unauthorized.',
        },
      }
    }

    const workerApp = await this.getApp(requestData.appIdentifier)
    if (!workerApp) {
      // app by appIdentifier not found
      return {
        result: undefined,
        error: {
          code: 404,
          message: 'App not found.',
        },
      }
    }

    // Check if the UI exists in the app's menuItems
    const uiExists = requestData.uiName in workerApp.uis

    if (!uiExists) {
      // UI by uiName not found in app by appIdentifier
      return {
        result: undefined,
        error: {
          code: 404,
          message: 'UI not found.',
        },
      }
    }

    const serverStorageLocation =
      await this.serverConfigurationService.getServerStorageLocation()

    if (!serverStorageLocation) {
      return {
        result: undefined,
        error: {
          code: 500,
          message: 'Server storage location not available.',
        },
      }
    }

    const presignedGetURL = this.s3Service.createS3PresignedUrls([
      {
        method: SignedURLsRequestMethod.GET,
        objectKey: `${serverStorageLocation.prefix ? serverStorageLocation.prefix + '/' : ''}${requestData.appIdentifier}/ui/${requestData.uiName}.zip`,
        accessKeyId: serverStorageLocation.accessKeyId,
        secretAccessKey: serverStorageLocation.secretAccessKey,
        bucket: serverStorageLocation.bucket,
        endpoint: serverStorageLocation.endpoint,
        expirySeconds: 3600,
        region: serverStorageLocation.region,
      },
    ])

    return {
      manifest: workerApp.uis[requestData.uiName]['files'],
      bundleUrl: presignedGetURL[0],
    }
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
      Object.keys(app.manifest).filter(
        (manifestItemPath) =>
          manifestItemPath.startsWith('/ui') ||
          manifestItemPath.startsWith('/workers'),
      ).length

    if (appRequiresStorage && serverStorageLocation) {
      const prefix = `${serverStorageLocation.prefix ? serverStorageLocation.prefix + '/' : ''}${app.identifier}/`
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
    const assetManifestEntryPaths = Object.keys(app.manifest).filter(
      (manifestItemPath) =>
        manifestItemPath.startsWith('/ui') ||
        manifestItemPath.startsWith('/workers'),
    )

    const serverStorageLocation =
      await this.serverConfigurationService.getServerStorageLocation()
    const appRequiresStorage =
      app.config.requiresStorage || assetManifestEntryPaths.length

    if (appRequiresStorage && !serverStorageLocation) {
      throw new AppRequirementsNotSatisfiedException()
    }

    if (installedApp) {
      // uninstall currently installed app instance
      await this.uninstallApp(app)
    }

    if (serverStorageLocation) {
      // 1. Group assetManifestEntries by /ui/<name>/ or /workers/<name>/
      const groupedAssets = new Map<
        string,
        {
          groupType: 'ui' | 'worker'
          groupName: string
          entries: typeof assetManifestEntryPaths
        }
      >()

      for (const entryPath of assetManifestEntryPaths) {
        const match = entryPath.match(/^\/(ui|workers)\/([^/]+)\//)
        if (!match) {
          continue
        }
        const [_, type, name] = match
        const key = `${type}__${name}`
        if (!groupedAssets.has(key)) {
          groupedAssets.set(key, {
            groupType: type as 'ui' | 'worker',
            groupName: name,
            entries: [],
          })
        }
        const group = groupedAssets.get(key)
        if (group) {
          group.entries.push(entryPath)
        }
      }

      // 2. For each group, zip the files and upload
      for (const [
        groupKey,
        { groupType, groupName, entries },
      ] of groupedAssets) {
        // Create a temp dir for this group
        const tempDir = await fsPromises.mkdtemp(
          path.join(os.tmpdir(), `appzip-${groupKey}-`),
        )
        const groupDir = path.join(tempDir, groupName)
        const relRoot =
          groupType === 'ui' ? `/ui/${groupName}/` : `/workers/${groupName}/`

        // Copy files into temp dir, preserving structure
        for (const entryPath of entries) {
          const relPath = entryPath.slice(relRoot.length)
          const destPath = path.join(groupDir, relPath)
          await fsPromises.mkdir(path.dirname(destPath), { recursive: true })
          const srcPath = path.join(
            this._appConfig.appsLocalPath,
            app.identifier,
            entryPath,
          )
          await fsPromises.copyFile(srcPath, destPath)
        }

        // Zip the contents
        const zipName = `${groupName}.zip`
        const zipPath = path.join(os.tmpdir(), zipName)
        // Use Bun.spawn to call zip
        // zip -r <zipPath> <groupName> (from inside tempDir)
        const zipProc = spawn({
          cmd: ['zip', '-r', zipPath, groupName],
          cwd: tempDir,
          stdout: 'inherit',
          stderr: 'inherit',
        })
        const zipCode = await zipProc.exited
        if (zipCode !== 0) {
          throw new Error(`Failed to zip assets for group ${groupKey}`)
        }

        // Upload zip to app storage
        const objectKey = `${serverStorageLocation.prefix ? serverStorageLocation.prefix + '/' : ''}${app.identifier}/${groupType}/${zipName}`
        // eslint-disable-next-line no-console
        console.log('Uploading app asset zip:', {
          objectKey,
          zipPath,
        })
        const [url] = this.s3Service.createS3PresignedUrls([
          {
            ...serverStorageLocation,
            method: SignedURLsRequestMethod.PUT,
            expirySeconds: 600,
            objectKey,
          },
        ])
        // Upload the zip file
        await uploadFile(zipPath, url, 'application/zip')
        // Clean up temp files
        await fsPromises.rm(tempDir, { recursive: true, force: true })
        await fsPromises.rm(zipPath, { force: true })
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
    directoryName: string,
    update: boolean,
  ) {
    const app = await this.parseAppFromDisk(directoryName)

    const appIdentifier = app.definition?.identifier
    if (app.validation.value && app.definition) {
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
      console.log(
        `APP PARSE ERROR - APP[${appIdentifier ?? '__UNKNONW__'}] - (directory: ${directoryName}): DEFINITION_INVALID`,
        app.validation.error,
      )
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

  public async parseAppFromDisk(appDirectoryName: string): Promise<{
    definition?: App
    validation: { value: boolean; error?: z.ZodError }
  }> {
    const now = new Date()

    let currentTotalSize = 0
    const publicKeyPath = path.join(
      this._appConfig.appsLocalPath,
      appDirectoryName,
      '.publicKey',
    )
    const configPath = path.join(
      this._appConfig.appsLocalPath,
      appDirectoryName,
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

    const appIdentifier = config.identifier

    // console.log('READ APP CONFIG', { config, configPath, publicKeyPath, publicKey })
    const appRoot = path.join(this._appConfig.appsLocalPath, appDirectoryName)
    const manifest = (
      await Promise.all(
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
            mimeType:
              mime.getType(relativeAssetPath) ?? 'application/octet-stream',
          }
        }),
      )
    ).reduce<AppManifest>((acc, nextManifestEntry) => {
      acc[nextManifestEntry.path] = {
        hash: nextManifestEntry.hash,
        size: nextManifestEntry.size,
        mimeType: nextManifestEntry.mimeType,
      }
      return acc
    }, {})

    const workerScripts = Object.entries(
      config.workerScripts ?? {},
    ).reduce<AppWorkerScriptMap>((acc, [workerIdentifier, value]) => {
      return {
        ...acc,
        [workerIdentifier]: {
          ...value,
          files: Object.keys(manifest)
            .filter((manifestEntryPath) =>
              manifestEntryPath.startsWith(`/workers/${workerIdentifier}/`),
            )
            .reduce(
              (manifestEntryAcc, manifestEntryPath) => ({
                ...manifestEntryAcc,
                [manifestEntryPath]: {
                  hash: manifest[manifestEntryPath].hash,
                  size: manifest[manifestEntryPath].size,
                  mimeType: manifest[manifestEntryPath].mimeType,
                },
              }),
              {},
            ),
          envVars: value.envVars ?? {},
        },
      }
    }, {})

    const uis = Object.entries(config.uis ?? {}).reduce<AppUIMap>(
      (acc, [uiIdentifier, value]) => ({
        ...acc,
        [uiIdentifier]: {
          ...value,
          files: Object.keys(manifest)
            .filter((manifestEntryPath) =>
              manifestEntryPath.startsWith(`/ui/${uiIdentifier}/`),
            )
            .reduce(
              (manifestEntryAcc, manifestEntryPath) => ({
                ...manifestEntryAcc,
                [manifestEntryPath]: {
                  hash: manifest[manifestEntryPath].hash,
                  size: manifest[manifestEntryPath].size,
                  mimeType: manifest[manifestEntryPath].mimeType,
                },
              }),
              {},
            ),
        },
      }),
      {},
    )

    const parseResult = appConfigSchema.safeParse(config)

    const app = {
      validation: {
        value: parseResult.success,
        error: parseResult.success ? undefined : parseResult.error,
      },
      definition: {
        identifier: appIdentifier,
        label: config.label,
        manifest,
        publicKey,
        workerScripts,
        uis,
        config,
        createdAt: now,
        updatedAt: now,
        contentHash: '', // TODO: calculate the exact content hash
      },
    }
    return app
  }

  /**
   * Update the envVars for a specific worker script in an app.
   * @param params.appIdentifier - The app's identifier
   * @param params.workerIdentifier - The worker script's identifier
   * @param params.envVars - The new environment variables
   * @returns The updated envVars object
   */
  async setAppWorkerEnvVars({
    appIdentifier,
    workerIdentifier,
    envVars,
  }: {
    appIdentifier: string
    workerIdentifier: string
    envVars: Record<string, string>
  }): Promise<Record<string, string>> {
    // Fetch the app
    const app = await this.getApp(appIdentifier)
    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!app.workerScripts[workerIdentifier]) {
      throw new NotFoundException(
        `Worker script not found: ${workerIdentifier}`,
      )
    }
    // Update envVars for the specified worker
    app.workerScripts[workerIdentifier] = {
      ...app.workerScripts[workerIdentifier],
      envVars: { ...envVars },
    }
    // Persist the change
    await this.ormService.db
      .update(appsTable)
      .set({ workerScripts: app.workerScripts })
      .where(eq(appsTable.identifier, appIdentifier))

    return app.workerScripts[workerIdentifier].envVars
  }

  getExternalWorkerConnections(): Record<string, ExternalAppWorker[]> {
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
          .reduce<Record<string, ExternalAppWorker[]>>(
            (acc, _r: string | undefined) => {
              const parsed = JSON.parse(
                _r ?? 'null',
              ) as ExternalAppWorker | null
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
