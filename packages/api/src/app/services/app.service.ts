import { hashLocalFile } from '@lombokapp/core-worker'
import type {
  AppConfig,
  AppContributions,
  AppManifest,
  AppMetrics,
  AppWorkersMap,
  ExternalAppWorker,
} from '@lombokapp/types'
import {
  appConfigSchema,
  AppSocketApiRequest,
  CORE_APP_IDENTIFIER,
  metadataEntrySchema,
  SignedURLsRequestMethod,
  workerErrorDetailsSchema,
} from '@lombokapp/types'
import { safeZodParse } from '@lombokapp/utils'
import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common'
import nestJsConfig from '@nestjs/config'
import { spawn } from 'bun'
import {
  and,
  count,
  eq,
  ilike,
  inArray,
  isNotNull,
  isNull,
  or,
  SQL,
  sql,
} from 'drizzle-orm'
import fs from 'fs'
import fsPromises from 'fs/promises'
import mime from 'mime'
import os from 'os'
import path from 'path'
import { JWTService } from 'src/auth/services/jwt.service'
import { SessionService } from 'src/auth/services/session.service'
import { KVService } from 'src/cache/kv.service'
import { eventsTable } from 'src/event/entities/event.entity'
import type { FolderWithoutLocations } from 'src/folders/entities/folder.entity'
import { foldersTable } from 'src/folders/entities/folder.entity'
import { folderObjectsTable } from 'src/folders/entities/folder-object.entity'
import { FolderNotFoundException } from 'src/folders/exceptions/folder-not-found.exception'
import { FolderService } from 'src/folders/services/folder.service'
import {
  logEntriesTable,
  LogEntryLevel,
} from 'src/log/entities/log-entry.entity'
import { LogEntryService } from 'src/log/services/log-entry.service'
import { OrmService } from 'src/orm/orm.service'
import { readDirRecursive } from 'src/platform/utils/fs.util'
import { normalizeSortParam, parseSort } from 'src/platform/utils/sort.util'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { uploadFile } from 'src/shared/utils'
import {
  APP_WORKER_INFO_CACHE_KEY_PREFIX,
  AppSocketService,
} from 'src/socket/app/app-socket.service'
import { storageLocationsTable } from 'src/storage/entities/storage-location.entity'
import { S3Service } from 'src/storage/s3.service'
import { createS3PresignedUrls } from 'src/storage/s3.utils'
import { Task, tasksTable } from 'src/task/entities/task.entity'
import { User } from 'src/users/entities/user.entity'
import { z } from 'zod'

import { appConfig } from '../config'
import { CoreAppService } from '../core-app.service'
import { AppSort } from '../dto/apps-list-query-params.dto'
import { App, appsTable } from '../entities/app.entity'
import { AppAlreadyInstalledException } from '../exceptions/app-already-installed.exception'
import { AppInvalidException } from '../exceptions/app-invalid.exception'
import { AppNotParsableException } from '../exceptions/app-not-parsable.exception'
import { AppRequirementsNotSatisfiedException } from '../exceptions/app-requirements-not-satisfied.exception'

const MAX_APP_FILE_SIZE = 1024 * 1024 * 16
const MAX_APP_TOTAL_SIZE = 1024 * 1024 * 32

export type MetadataUploadUrlsResponse = {
  folderId: string
  objectKey: string
  url: string
}[]

const logEntrySchema = z.object({
  message: z.string(),
  level: z.nativeEnum(LogEntryLevel),
  subjectContext: z
    .object({
      folderId: z.string(),
      objectKey: z.string().optional(),
    })
    .optional(),
  data: z.unknown().optional(),
})

const attemptStartHandleTaskSchema = z.object({
  taskIdentifiers: z.array(z.string()),
})

const attemptStartHandleTaskByIdSchema = z.object({
  taskId: z.string().uuid(),
  taskHandlerId: z.string().nonempty().max(512).optional(),
})

const getWorkerExecutionDetailsSchema = z.object({
  appIdentifier: z.string(),
  workerIdentifier: z.string(),
})

const getAppUIbundleSchema = z.object({
  appIdentifier: z.string(),
})

const getContentSignedUrlsSchema = z.object({
  requests: z.array(
    z.object({
      folderId: z.string(),
      objectKey: z.string(),
      method: z.nativeEnum(SignedURLsRequestMethod),
    }),
  ),
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
})

const failHandleTaskSchema = z.object({
  taskId: z.string().uuid(),
  error: z.object({
    message: z.string(),
    code: z.string(),
    details: workerErrorDetailsSchema.optional(),
  }),
})

const completeHandleTaskSchema = z.object({
  taskId: z.string().uuid(),
})

const getAppStorageSignedUrlsSchema = z.object({
  requests: z.array(
    z.object({
      objectKey: z.string().min(1),
      method: z.nativeEnum(SignedURLsRequestMethod),
    }),
  ),
})

export interface AppDefinition {
  config: AppConfig
  ui: Record<string, { size: number; hash: string }>
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
  private readonly appSocketService: AppSocketService
  constructor(
    @Inject(appConfig.KEY)
    private readonly _appConfig: nestJsConfig.ConfigType<typeof appConfig>,
    private readonly coreAppService: CoreAppService,
    private readonly ormService: OrmService,
    private readonly logEntryService: LogEntryService,
    private readonly jwtService: JWTService,
    private readonly sessionService: SessionService,
    private readonly serverConfigurationService: ServerConfigurationService,
    private readonly kvService: KVService,
    @Inject(forwardRef(() => FolderService)) _folderService,
    @Inject(forwardRef(() => AppSocketService)) _appSocketService,
    private readonly s3Service: S3Service,
  ) {
    this.folderService = _folderService as FolderService
    this.appSocketService = _appSocketService as AppSocketService
  }

  public async setAppEnabledAsAdmin(
    user: User,
    appIdentifier: string,
    enabled: boolean,
  ): Promise<App> {
    if (!user.isAdmin) {
      throw new UnauthorizedException()
    }

    const app = await this.getAppAsAdmin(appIdentifier)
    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }

    const now = new Date()
    const [updated] = await this.ormService.db
      .update(appsTable)
      .set({ enabled, updatedAt: now })
      .where(eq(appsTable.identifier, appIdentifier))
      .returning()
    if (!enabled) {
      this.appSocketService.disconnectAllClientsByAppIdentifier(appIdentifier)
    } else {
      void this.coreAppService.startCoreAppThread()
    }
    return updated
  }

  getAppAsAdmin(
    appIdentifier: string,
    {
      enabled,
    }: {
      enabled?: boolean
    } = {},
  ): Promise<App | undefined> {
    const idCondition = eq(appsTable.identifier, appIdentifier)
    return this.ormService.db.query.appsTable.findFirst({
      where:
        typeof enabled === 'boolean'
          ? and(idCondition, eq(appsTable.enabled, enabled))
          : idCondition,
    })
  }

  async createAppUserSession(user: User, appIdentifier: string) {
    const app = await this.getAppAsAdmin(appIdentifier, { enabled: true })
    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }

    return this.sessionService.createAppUserSession(user, appIdentifier)
  }

  async handleAppRequest(
    handlerId: string,
    requestingAppIdentifier: string,
    message: unknown,
  ) {
    if (safeZodParse(message, AppSocketApiRequest)) {
      const requestData = message.data
      const isCoreApp = requestingAppIdentifier === CORE_APP_IDENTIFIER
      switch (message.name) {
        case 'SAVE_LOG_ENTRY':
          if (safeZodParse(requestData, logEntrySchema)) {
            await this.logEntryService.emitLog({
              emitterIdentifier: requestingAppIdentifier,
              logMessage: requestData.message,
              data: requestData.data,
              level: requestData.level,
              subjectContext: requestData.subjectContext,
            })
            return {
              result: undefined,
            }
          }
          return {
            error: {
              code: 400,
              message: 'Invalid request.',
              details: logEntrySchema.safeParse(requestData).error?.errors,
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
          if (safeZodParse(requestData, completeHandleTaskSchema)) {
            const task = await this.ormService.db.query.tasksTable.findFirst({
              where: and(
                eq(tasksTable.id, requestData.taskId),
                isNull(tasksTable.completedAt),
                isNull(tasksTable.errorAt),
                eq(
                  tasksTable.handlerId,
                  `${requestingAppIdentifier}:${handlerId}`,
                ),
                ...(isCoreApp
                  ? [
                      or(
                        isNotNull(tasksTable.workerIdentifier),
                        eq(tasksTable.ownerIdentifier, requestingAppIdentifier),
                      ),
                    ]
                  : [
                      isNull(tasksTable.workerIdentifier),
                      eq(tasksTable.ownerIdentifier, requestingAppIdentifier),
                    ]),
              ),
            })
            if (!task) {
              return {
                error: {
                  code: 400,
                  message: 'Invalid request.',
                  details: 'No task found.',
                },
              }
            }
            const now = new Date()
            return {
              result: await this.ormService.db
                .update(tasksTable)
                .set({ completedAt: now, updatedAt: now })
                .where(eq(tasksTable.id, task.id)),
            }
          }
          break
        }
        case 'ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK': {
          if (safeZodParse(requestData, attemptStartHandleTaskSchema)) {
            let securedTask: Task | undefined = undefined
            for (let attempt = 0; attempt < 5; attempt++) {
              const task = await this.ormService.db.query.tasksTable.findFirst({
                where: and(
                  eq(tasksTable.ownerIdentifier, requestingAppIdentifier),
                  inArray(
                    tasksTable.taskIdentifier,
                    requestData.taskIdentifiers,
                  ),
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
              const now = new Date()
              securedTask = (
                await this.ormService.db
                  .update(tasksTable)
                  .set({
                    startedAt: now,
                    updatedAt: now,
                    handlerId: `${requestingAppIdentifier}:${handlerId}`,
                  })
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
            const event = await this.ormService.db.query.eventsTable.findFirst({
              where: eq(eventsTable.id, securedTask.triggeringEventId),
            })
            return {
              result: { ...securedTask, event },
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
        case 'ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID': {
          if (safeZodParse(requestData, attemptStartHandleTaskByIdSchema)) {
            if (!isCoreApp) {
              return {
                result: undefined,
                error: {
                  code: 403,
                  message: 'Unauthorized to handle worker tasks.',
                },
              }
            }

            const rows = await this.ormService.db
              .select({ task: tasksTable, app: appsTable })
              .from(tasksTable)
              .innerJoin(
                appsTable,
                eq(tasksTable.ownerIdentifier, appsTable.identifier),
              )
              .where(eq(tasksTable.id, requestData.taskId))
              .limit(1)
            if (rows.length === 0) {
              return {
                result: undefined,
                error: {
                  code: 400,
                  message: 'Invalid request (no task found by id).',
                },
              }
            }
            const { task } = rows[0]

            if (task.startedAt || task.completedAt || task.handlerId) {
              return {
                result: undefined,
                error: {
                  code: 400,
                  message: 'Task already started.',
                },
              }
            }
            const now = new Date()
            const updatedTask = (
              await this.ormService.db
                .update(tasksTable)
                .set({
                  startedAt: now,
                  updatedAt: now,
                  handlerId: `${requestingAppIdentifier}:${handlerId}`,
                })
                .where(eq(tasksTable.id, task.id))
                .returning()
            )[0]
            const event = await this.ormService.db.query.eventsTable.findFirst({
              where: eq(eventsTable.id, updatedTask.triggeringEventId),
            })

            return { result: { ...updatedTask, event } }
          }
          break
        }
        case 'FAIL_HANDLE_TASK': {
          if (safeZodParse(requestData, failHandleTaskSchema)) {
            const parsedFailHandleTaskMessage =
              failHandleTaskSchema.parse(requestData)
            const taskWithApp = await this.ormService.db
              .select({ task: tasksTable, app: appsTable })
              .from(tasksTable)
              .innerJoin(
                appsTable,
                eq(tasksTable.ownerIdentifier, appsTable.identifier),
              )
              .where(
                and(
                  eq(tasksTable.id, requestData.taskId),
                  isNotNull(tasksTable.startedAt),
                  isNull(tasksTable.completedAt),
                  isNull(tasksTable.errorAt),
                  eq(
                    tasksTable.handlerId,
                    `${requestingAppIdentifier}:${handlerId}`,
                  ),
                  ...(!isCoreApp
                    ? [
                        isNull(tasksTable.workerIdentifier),
                        eq(tasksTable.ownerIdentifier, requestingAppIdentifier),
                      ]
                    : [
                        or(
                          isNotNull(tasksTable.workerIdentifier),
                          eq(tasksTable.ownerIdentifier, CORE_APP_IDENTIFIER),
                        ),
                      ]),
                ),
              )
              .limit(1)
            const task = taskWithApp[0]?.task as Task | undefined
            if (!task) {
              return {
                result: undefined,
                error: {
                  code: 400,
                  message: 'Invalid request.',
                },
              }
            }

            const now = new Date()
            return {
              result: await this.ormService.db
                .update(tasksTable)
                .set({
                  errorCode: parsedFailHandleTaskMessage.error.code,
                  errorMessage: parsedFailHandleTaskMessage.error.message,
                  errorDetails: parsedFailHandleTaskMessage.error.details,
                  errorAt: now,
                  updatedAt: now,
                })
                .where(eq(tasksTable.id, task.id)),
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
            if (requestingAppIdentifier !== CORE_APP_IDENTIFIER) {
              // must be "core" app to access app worker payloads
              return {
                result: undefined,
                error: {
                  code: 403,
                  message: 'Unauthorized.',
                },
              }
            }

            const workerApp = await this.getAppAsAdmin(
              requestData.appIdentifier,
              { enabled: true },
            )
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

            if (!(requestData.workerIdentifier in workerApp.workers)) {
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
              await this.serverConfigurationService.getServerStorage()

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
                objectKey: `${serverStorageLocation.prefix ? serverStorageLocation.prefix + '/' : ''}app-bundle-storage/${requestData.appIdentifier}/workers/${requestData.workerIdentifier}/${workerApp.workers[requestData.workerIdentifier].hash}.zip`,
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
                environmentVariables:
                  workerApp.workers[requestData.workerIdentifier]
                    .environmentVariables,
                workerToken: await this.jwtService.createAppWorkerToken(
                  requestData.appIdentifier,
                ),
                hash: workerApp.workers[requestData.workerIdentifier].hash,
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
        case 'GET_APP_STORAGE_SIGNED_URLS': {
          if (safeZodParse(requestData, getAppStorageSignedUrlsSchema)) {
            return {
              result: await this.createSignedAppStorageUrls(
                requestingAppIdentifier,
                requestData,
              ),
            }
          }
          return {
            result: undefined,
            error: {
              code: 400,
              message: 'Malformed GET_APP_STORAGE_SIGNED_URLS request.',
            },
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

    return {
      urls,
    }
  }

  async createSignedAppStorageUrls(
    requestingAppIdentifier: string,
    payload: {
      requests: {
        objectKey: string
        method: SignedURLsRequestMethod
      }[]
    },
  ) {
    const serverStorage =
      await this.serverConfigurationService.getServerStorage()
    if (!serverStorage) {
      throw new Error('Server storage not found')
    }
    const urls = this.s3Service.createS3PresignedUrls(
      payload.requests.map(({ method, objectKey }) => ({
        method,
        objectKey: `${serverStorage.prefix}${!serverStorage.prefix || serverStorage.prefix.endsWith('/') ? '' : '/'}app-runtime-storage/${requestingAppIdentifier}${objectKey.startsWith('/') ? '' : '/'}${objectKey}`,
        accessKeyId: serverStorage.accessKeyId,
        secretAccessKey: serverStorage.secretAccessKey,
        bucket: serverStorage.bucket,
        endpoint: serverStorage.endpoint,
        expirySeconds: 3600,
        region: serverStorage.region,
      })),
    )
    return {
      urls,
    }
  }

  async _createSignedUrls(
    signedUrlRequests: {
      method: SignedURLsRequestMethod
      folderId: string
      objectKey: string
    }[],
  ): Promise<
    {
      folderId: string
      objectKey: string
      method: SignedURLsRequestMethod
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
      method: signedUrl.method,
      folderId: signedUrl.folderId,
      objectKey: signedUrl.objectKey,
    }))
  }

  async getAppUIbundle(
    requestingAppIdentifier: string,
    requestData: { appIdentifier: string },
  ) {
    // verify the app is the installed "core" app
    if (requestingAppIdentifier !== CORE_APP_IDENTIFIER) {
      // must be "core" app to access app UI bundles
      return {
        result: undefined,
        error: {
          code: 403,
          message: 'Unauthorized.',
        },
      }
    }

    const workerApp = await this.getAppAsAdmin(requestData.appIdentifier, {
      enabled: true,
    })
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

    if (!workerApp.ui) {
      // No UI bundle exists for this app
      return {
        result: undefined,
        error: {
          code: 404,
          message: 'UI bundle not found.',
        },
      }
    }

    const serverStorageLocation =
      await this.serverConfigurationService.getServerStorage()

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
        objectKey: `${serverStorageLocation.prefix ? serverStorageLocation.prefix + '/' : ''}app-bundle-storage/${requestData.appIdentifier}/ui/${workerApp.ui.hash}.zip`,
        accessKeyId: serverStorageLocation.accessKeyId,
        secretAccessKey: serverStorageLocation.secretAccessKey,
        bucket: serverStorageLocation.bucket,
        endpoint: serverStorageLocation.endpoint,
        expirySeconds: 3600,
        region: serverStorageLocation.region,
      },
    ])

    return {
      manifest: workerApp.ui.manifest,
      bundleUrl: presignedGetURL[0],
    }
  }

  public async listAppsAsAdmin(
    user: User,
    {
      offset,
      limit,
      sort = [AppSort.CreatedAtDesc],
      search,
      enabled,
    }: {
      offset?: number
      limit?: number
      sort?: AppSort[]
      search?: string
      enabled?: boolean
    } = {},
  ): Promise<{ meta: { totalCount: number }; result: App[] }> {
    if (!user.isAdmin) {
      throw new UnauthorizedException()
    }

    const conditions: (SQL | undefined)[] = []

    if (search) {
      conditions.push(
        or(
          ilike(appsTable.label, `%${search}%`),
          ilike(appsTable.identifier, `%${search}%`),
        ),
      )
    }

    if (typeof enabled === 'boolean') {
      conditions.push(eq(appsTable.enabled, enabled))
    }

    const apps = await this.ormService.db.query.appsTable.findMany({
      ...(conditions.length ? { where: and(...conditions) } : {}),
      offset: Math.max(0, offset ?? 0),
      limit: Math.min(100, limit ?? 25),
      orderBy: parseSort(
        appsTable,
        normalizeSortParam(sort) ?? [AppSort.CreatedAtDesc],
      ),
    })

    const appsCountResult = await this.ormService.db
      .select({
        count: count(),
      })
      .from(appsTable)
      .where(conditions.length ? and(...conditions) : undefined)

    return {
      result: apps,
      meta: { totalCount: appsCountResult[0]?.count ?? 0 },
    }
  }

  public async uninstallApp(app: App) {
    const serverStorageLocation =
      await this.serverConfigurationService.getServerStorage()
    const appRequiresStorage = Object.keys(app.manifest).filter(
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
    const installedApp = await this.getAppAsAdmin(app.identifier)
    if (installedApp && !update) {
      throw new AppAlreadyInstalledException()
    }
    const assetManifestEntryPaths = Object.keys(app.manifest).filter(
      (manifestItemPath) =>
        manifestItemPath.startsWith('/ui') ||
        manifestItemPath.startsWith('/workers'),
    )

    const serverStorageLocation =
      await this.serverConfigurationService.getServerStorage()
    const appRequiresStorage = assetManifestEntryPaths.length > 0

    if (appRequiresStorage && !serverStorageLocation) {
      throw new AppRequirementsNotSatisfiedException()
    }

    if (installedApp) {
      // uninstall currently installed app instance
      await this.uninstallApp(app)
    }

    if (serverStorageLocation) {
      // Helper function to create, zip, hash, and upload a bundle
      const createAndUploadBundle = async (
        bundleName: string,
        storagePath: string,
        pathPrefix: string,
      ): Promise<string> => {
        // Create a temp dir for this bundle
        const bundleDir = await fsPromises.mkdtemp(
          path.join(os.tmpdir(), `appzip-${bundleName}-`),
        )
        const filePaths = assetManifestEntryPaths.filter((filePath) =>
          filePath.startsWith(pathPrefix),
        )
        if (filePaths.length === 0) {
          throw new Error(`No files found for bundle ${bundleName}`)
        }

        // Copy files into temp dir, preserving structure
        for (const entryPath of filePaths) {
          const relPath = entryPath.slice(pathPrefix.length)
          const destPath = path.join(bundleDir, relPath)
          await fsPromises.mkdir(path.dirname(destPath), { recursive: true })
          const srcPath = path.join(
            this._appConfig.appsLocalPath,
            app.identifier,
            entryPath,
          )
          await fsPromises.copyFile(srcPath, destPath)
        }

        // Zip the contents
        const zipName = `${bundleName}.zip`
        const zipPath = path.join(bundleDir, zipName)
        const zipProc = spawn({
          cmd: ['zip', '-r', zipPath, './'],
          cwd: bundleDir,
          stdout: 'inherit',
          stderr: 'inherit',
        })
        const zipCode = await zipProc.exited
        if (zipCode !== 0) {
          throw new Error(`Failed to zip assets for bundle ${bundleName}`)
        }

        // Compute hash of the zipped bundle
        const zipHash = await hashLocalFile(zipPath)

        // Upload zip to app storage
        const objectKey = [
          serverStorageLocation.prefix?.replace(/\/+$/, '') ?? '',
          'app-bundle-storage',
          app.identifier,
          storagePath,
          `${zipHash}.zip`,
        ]
          .filter(Boolean)
          .join('/')

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

        // Clean up temp dir
        await fsPromises.rm(bundleDir, { recursive: true, force: true })

        return zipHash
      }

      // Process UI bundle if it exists in the app config
      if (app.config.ui) {
        const zipHash = await createAndUploadBundle('ui', 'ui', '/ui/')
        app.ui = {
          ...(app.ui ?? { manifest: {} }),
          hash: zipHash,
        }
      }

      // Process worker bundles based on app.config.workers
      if (app.config.workers) {
        for (const workerName of Object.keys(app.config.workers)) {
          const zipHash = await createAndUploadBundle(
            workerName,
            `workers/${workerName}`,
            `/workers/${workerName}/`,
          )
          app.workers[workerName] = {
            ...(app.workers[workerName] ?? {}),
            hash: zipHash,
          }
        }
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
    try {
      const app = await this.parseAppFromDisk(directoryName)

      if (app.validation.value && app.definition) {
        await this.installApp(app.definition, update)
      } else {
        // eslint-disable-next-line no-console
        console.log(
          `APP PARSE ERROR - (dir: '${directoryName}'): App config is invalid`,
          app.validation.error?.errors,
        )
      }
    } catch (error) {
      if (error instanceof AppAlreadyInstalledException) {
        // eslint-disable-next-line no-console
        console.log(
          `APP INSTALL ERROR (dir: '${directoryName}'): App is already installed.`,
        )
      } else if (error instanceof AppNotParsableException) {
        // eslint-disable-next-line no-console
        console.log(
          `APP INSTALL ERROR (dir: '${directoryName}'): App is not parsable.`,
        )
      } else if (error instanceof AppRequirementsNotSatisfiedException) {
        // eslint-disable-next-line no-console
        console.log(
          `APP INSTALL ERROR (dir: '${directoryName}'): App requirements are not met.`,
        )
      } else if (error instanceof AppInvalidException) {
        // eslint-disable-next-line no-console
        console.log(
          `APP INSTALL ERROR (dir: '${directoryName}'): App is invalid.`,
          error.message,
        )
      } else {
        // eslint-disable-next-line no-console
        console.log(`APP INSTALL ERROR - (dir: '${directoryName}'):`, error)
      }
    }
  }

  public getAllPotentialAppDirectories = (appsDirectoryPath: string) => {
    if (!fs.existsSync(appsDirectoryPath)) {
      // eslint-disable-next-line no-console
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
      throw new AppNotParsableException(`Config file not found`)
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

    const workerScriptDefinitions = Object.entries(
      config.workers ?? {},
    ).reduce<AppWorkersMap>((acc, [workerIdentifier, value]) => {
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
          environmentVariables: value.environmentVariables ?? {},
          hash: '',
        },
      }
    }, {})

    for (const workerScript of Object.keys(workerScriptDefinitions)) {
      if (
        !(
          `/workers/${workerScript}/index.ts` in
          workerScriptDefinitions[workerScript].files
        ) &&
        !(
          `/workers/${workerScript}/index.js` in
          workerScriptDefinitions[workerScript].files
        )
      ) {
        throw new AppInvalidException(
          `App ${appIdentifier} has a worker script "${workerScript}" defined without have an index.ts or index.js file.`,
        )
      }
    }

    const uiDefinition = {
      hash: '',
      manifest: Object.keys(manifest)
        .filter((manifestEntryPath) => manifestEntryPath.startsWith(`/ui/`))
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
    }

    const parseResult = appConfigSchema.safeParse(config)

    const app = {
      validation: {
        value: parseResult.success,
        error: parseResult.success ? undefined : parseResult.error,
      },
      definition: parseResult.success
        ? {
            identifier: appIdentifier,
            label: config.label,
            manifest,
            publicKey,
            workers: workerScriptDefinitions,
            subscribedEvents: config.tasks.reduce<string[]>(
              (acc, task) => acc.concat(task.triggers),
              [],
            ),
            implementedTasks: config.tasks.map((t) => t.identifier),
            requiresStorage:
              Object.keys(uiDefinition).length > 0 ||
              Object.keys(workerScriptDefinitions).length > 0,
            ui: Object.keys(uiDefinition).length > 0 ? uiDefinition : null,
            config,
            createdAt: now,
            updatedAt: now,
            contentHash: '', // TODO: calculate the exact content hash
            enabled: true,
          }
        : undefined,
    }
    return app
  }

  /**
   * Update the environmentVariables for a specific worker script in an app.
   * @param params.appIdentifier - The app's identifier
   * @param params.workerIdentifier - The worker script's identifier
   * @param params.environmentVariables - The new environment variables
   * @returns The updated environmentVariables object
   */
  async setAppWorkerEnvironmentVariables({
    appIdentifier,
    workerIdentifier,
    environmentVariables,
  }: {
    appIdentifier: string
    workerIdentifier: string
    environmentVariables: Record<string, string>
  }): Promise<Record<string, string>> {
    // Fetch the app
    const app = await this.getAppAsAdmin(appIdentifier)
    if (!app) {
      throw new NotFoundException(`App not found: ${appIdentifier}`)
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (!app.workers[workerIdentifier]) {
      throw new NotFoundException(
        `Worker script not found: ${workerIdentifier}`,
      )
    }
    // Update environmentVariables for the specified worker
    app.workers[workerIdentifier] = {
      ...app.workers[workerIdentifier],
      environmentVariables: { ...environmentVariables },
    }
    // Persist the change
    await this.ormService.db
      .update(appsTable)
      .set({ workers: app.workers })
      .where(eq(appsTable.identifier, appIdentifier))

    return app.workers[workerIdentifier].environmentVariables
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

  async getAppContributions(): Promise<
    Record<
      string,
      {
        appLabel: string
        appIdentifier: string
        contributions: AppContributions
      }
    >
  > {
    const apps = await this.ormService.db.query.appsTable.findMany({
      where: eq(appsTable.enabled, true),
    })

    return apps.reduce((acc, nextApp) => {
      const contributions: AppContributions | undefined =
        nextApp.config.contributions ?? undefined
      return {
        ...acc,
        [nextApp.identifier]: {
          appLabel: nextApp.label,
          appIdentifier: nextApp.identifier,
          contributions: {
            sidebarMenuLinks: contributions?.sidebarMenuLinks ?? [],
            folderSidebarViews: contributions?.folderSidebarViews ?? [],
            objectSidebarViews: contributions?.objectSidebarViews ?? [],
            objectDetailViews: contributions?.objectDetailViews ?? [],
          },
        },
      }
    }, {})
  }

  async calculateAppMetrics(appIdentifier: string): Promise<AppMetrics> {
    const now = new Date()
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const tenMinutesAgo = new Date(now.getTime() - 10 * 60 * 1000)

    // Calculate tasks executed in the last 24 hours
    const tasksLast24Hours = await this.ormService.db
      .select({
        completed: count(tasksTable.id),
        failed: count(tasksTable.errorAt),
      })
      .from(tasksTable)
      .where(
        and(
          eq(tasksTable.ownerIdentifier, appIdentifier),
          or(
            and(
              isNotNull(tasksTable.completedAt),
              sql`${tasksTable.completedAt} >= ${oneDayAgo.toISOString()}::timestamp`,
            ),
            and(
              isNotNull(tasksTable.errorAt),
              sql`${tasksTable.errorAt} >= ${oneDayAgo.toISOString()}::timestamp`,
            ),
          ),
        ),
      )

    // Calculate errors in the last 24 hours
    const errorsLast24Hours = await this.ormService.db
      .select({
        total: count(logEntriesTable.id),
        last10Minutes: count(
          sql`CASE WHEN ${logEntriesTable.createdAt} >= ${tenMinutesAgo.toISOString()}::timestamp THEN 1 END`,
        ),
      })
      .from(logEntriesTable)
      .where(
        and(
          eq(logEntriesTable.emitterIdentifier, appIdentifier),
          eq(logEntriesTable.level, LogEntryLevel.ERROR),
          sql`${logEntriesTable.createdAt} >= ${oneDayAgo.toISOString()}::timestamp`,
        ),
      )

    // Calculate events emitted in the last 24 hours
    const eventsLast24Hours = await this.ormService.db
      .select({
        total: count(eventsTable.id),
        last10Minutes: count(
          sql`CASE WHEN ${eventsTable.createdAt} >= ${tenMinutesAgo.toISOString()}::timestamp THEN 1 END`,
        ),
      })
      .from(eventsTable)
      .where(
        and(
          eq(eventsTable.emitterIdentifier, appIdentifier),
          sql`${eventsTable.createdAt} >= ${oneDayAgo.toISOString()}::timestamp`,
        ),
      )

    return {
      tasksExecutedLast24Hours: {
        completed: Number(tasksLast24Hours[0]?.completed ?? 0),
        failed: Number(tasksLast24Hours[0]?.failed ?? 0),
      },
      errorsLast24Hours: {
        total: Number(errorsLast24Hours[0]?.total ?? 0),
        last10Minutes: Number(errorsLast24Hours[0]?.last10Minutes ?? 0),
      },
      eventsEmittedLast24Hours: {
        total: Number(eventsLast24Hours[0]?.total ?? 0),
        last10Minutes: Number(eventsLast24Hours[0]?.last10Minutes ?? 0),
      },
    }
  }
}
