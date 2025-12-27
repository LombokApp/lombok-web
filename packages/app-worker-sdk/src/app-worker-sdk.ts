import {
  appMessageErrorSchema,
  type AppSocketMessage,
  type AppSocketMessageDataMap,
  AppSocketMessageResponseSchemaMap,
  type AppSocketMessageResultMap,
  type AppSocketResponseError,
  type JsonSerializableObject,
  type TaskDTO,
  type WorkerApiActor,
} from '@lombokapp/types'
import {
  drizzle,
  type NodePgClient,
  type NodePgDatabase,
} from 'drizzle-orm/node-postgres'
import pg from 'pg'
import type { Socket } from 'socket.io-client'
import type { z } from 'zod'

const DEFAULT_SOCKET_RESPONSE_TIMEOUT = 30000

export class AppAPIError extends Error {
  errorCode: string | number
  details?: JsonSerializableObject
  constructor(
    errorCode: string | number,
    errorMessage = '',
    details?: JsonSerializableObject,
  ) {
    super()
    this.errorCode = errorCode
    this.message = errorMessage
    this.details = details
  }
}

type SocketResponse<K extends z.infer<typeof AppSocketMessage>> =
  AppSocketMessageResultMap[K]

export interface IAppPlatformService {
  getServerBaseUrl: () => string
  emitEvent: (
    params: AppSocketMessageDataMap['EMIT_EVENT'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'EMIT_EVENT'>>
  getWorkerExecutionDetails: (
    params: AppSocketMessageDataMap['GET_WORKER_EXECUTION_DETAILS'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'GET_WORKER_EXECUTION_DETAILS'>>
  getAppUIbundle: (
    params: AppSocketMessageDataMap['GET_APP_UI_BUNDLE'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'GET_APP_UI_BUNDLE'>>
  saveLogEntry: (
    entry: AppSocketMessageDataMap['SAVE_LOG_ENTRY'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'SAVE_LOG_ENTRY'>>
  attemptStartHandleTaskById: (
    params: AppSocketMessageDataMap['ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID'>>
  attemptStartHandleAnyAvailableTask: (
    params: AppSocketMessageDataMap['ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK'>>
  completeHandleTask: (
    params: AppSocketMessageDataMap['COMPLETE_HANDLE_TASK'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'COMPLETE_HANDLE_TASK'>>
  authenticateUser: (
    params: AppSocketMessageDataMap['AUTHENTICATE_USER'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'AUTHENTICATE_USER'>>
  getMetadataSignedUrls: (
    params: AppSocketMessageDataMap['GET_METADATA_SIGNED_URLS'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'GET_METADATA_SIGNED_URLS'>>
  getContentSignedUrls: (
    params: AppSocketMessageDataMap['GET_CONTENT_SIGNED_URLS'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'GET_CONTENT_SIGNED_URLS'>>
  getAppStorageSignedUrls: (
    params: AppSocketMessageDataMap['GET_APP_STORAGE_SIGNED_URLS'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'GET_APP_STORAGE_SIGNED_URLS'>>
  getAppUserAccessToken: (
    params: AppSocketMessageDataMap['GET_APP_USER_ACCESS_TOKEN'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'GET_APP_USER_ACCESS_TOKEN'>>
  updateContentMetadata: (
    params: AppSocketMessageDataMap['UPDATE_CONTENT_METADATA'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'UPDATE_CONTENT_METADATA'>>
  // Database methods
  getLatestDbCredentials: (
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'GET_LATEST_DB_CREDENTIALS'>>
  executeAppDockerJob: (
    params: AppSocketMessageDataMap['EXECUTE_APP_DOCKER_JOB'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'EXECUTE_APP_DOCKER_JOB'>>
  triggerAppTask: (
    params: AppSocketMessageDataMap['TRIGGER_APP_TASK'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'TRIGGER_APP_TASK'>>
}

interface PlatformApiExecuteOptions {
  timeoutMs?: number
}

export const buildAppClient = (
  socket: Socket,
  serverBaseUrl: string,
  defaultTimeoutMs = DEFAULT_SOCKET_RESPONSE_TIMEOUT,
): IAppPlatformService => {
  async function emitWithAck<K extends z.infer<typeof AppSocketMessage>>(
    name: K,
    ...args: AppSocketMessageDataMap[K] extends undefined
      ? [options?: PlatformApiExecuteOptions]
      : [data: AppSocketMessageDataMap[K], options?: PlatformApiExecuteOptions]
  ): Promise<SocketResponse<K>> {
    // When AppSocketMessageDataMap[K] is undefined, args is [options?]
    // When AppSocketMessageDataMap[K] is not undefined, args is [data, options?]
    const [firstArg, secondArg] = args
    // Check if firstArg is an options object (has timeoutMs property)
    const isOptionsObject =
      firstArg !== undefined &&
      typeof firstArg === 'object' &&
      'timeoutMs' in firstArg
    const data: AppSocketMessageDataMap[K] | undefined =
      args.length === 1 && isOptionsObject
        ? undefined // First arg is options, so data is undefined
        : (firstArg as AppSocketMessageDataMap[K] | undefined) // First arg is data (or undefined)
    const actualOptions: PlatformApiExecuteOptions =
      args.length === 1 && isOptionsObject
        ? firstArg // First arg is options
        : secondArg || {} // Second arg is options (or empty object)
    const timeoutMs =
      typeof actualOptions.timeoutMs === 'undefined'
        ? defaultTimeoutMs
        : actualOptions.timeoutMs
    const response = (await socket.timeout(timeoutMs).emitWithAck('APP_API', {
      name,
      data,
    })) as SocketResponse<K> | { error: AppSocketResponseError }

    if ('error' in response) {
      const parsedError = appMessageErrorSchema.safeParse(response.error)
      if (parsedError.success) {
        return {
          error: response.error,
        }
      }
      return {
        error: {
          code: 'APP_API_ERROR',
          message: 'Failed to parse response',
          details: {
            fieldErrors: parsedError.error.flatten().fieldErrors,
            formErrors: parsedError.error.flatten().formErrors,
          },
        },
      }
    }

    const parsedResponse =
      AppSocketMessageResponseSchemaMap[name].safeParse(response)

    if (!parsedResponse.success) {
      return {
        error: {
          code: 'APP_API_ERROR',
          message: 'Failed to parse response',
          details: {
            fieldErrors: parsedResponse.error.flatten().fieldErrors,
            formErrors: parsedResponse.error.flatten().formErrors,
          },
        },
      }
    }

    return parsedResponse.data as SocketResponse<K>
  }

  return {
    getServerBaseUrl() {
      return serverBaseUrl
    },
    emitEvent(params, options) {
      return emitWithAck('EMIT_EVENT', params, options)
    },
    getWorkerExecutionDetails(params, options) {
      return emitWithAck('GET_WORKER_EXECUTION_DETAILS', params, options)
    },
    getAppUIbundle(params, options) {
      return emitWithAck('GET_APP_UI_BUNDLE', params, options)
    },
    saveLogEntry(params, options) {
      return emitWithAck('SAVE_LOG_ENTRY', params, options)
    },
    getContentSignedUrls(params, options) {
      return emitWithAck('GET_CONTENT_SIGNED_URLS', params, options)
    },
    getMetadataSignedUrls(requests, options) {
      return emitWithAck('GET_METADATA_SIGNED_URLS', requests, options)
    },
    getAppStorageSignedUrls(params, options) {
      return emitWithAck('GET_APP_STORAGE_SIGNED_URLS', params, options)
    },
    getAppUserAccessToken(params, options) {
      return emitWithAck('GET_APP_USER_ACCESS_TOKEN', params, options)
    },
    updateContentMetadata(params, options) {
      return emitWithAck('UPDATE_CONTENT_METADATA', params, options)
    },
    completeHandleTask(params, options) {
      return emitWithAck('COMPLETE_HANDLE_TASK', params, options)
    },
    authenticateUser(params, options) {
      return emitWithAck('AUTHENTICATE_USER', params, options)
    },
    attemptStartHandleTaskById(params, options) {
      return emitWithAck(
        'ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID',
        params,
        options,
      )
    },
    attemptStartHandleAnyAvailableTask(params, options) {
      return emitWithAck(
        'ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK',
        params,
        options,
      )
    },
    executeAppDockerJob(params, options) {
      return emitWithAck('EXECUTE_APP_DOCKER_JOB', params, options)
    },
    triggerAppTask(params, options) {
      return emitWithAck('TRIGGER_APP_TASK', params, options)
    },
    getLatestDbCredentials(options) {
      return emitWithAck('GET_LATEST_DB_CREDENTIALS', options)
    },
  }
}

export class LombokAppPgClient {
  private pool?: pg.Pool
  private rotating?: Promise<void>

  constructor(private readonly server: IAppPlatformService) {}

  private async ensurePool(): Promise<pg.Pool> {
    if (!this.pool) {
      const credsResponse = await this.server.getLatestDbCredentials()
      if ('error' in credsResponse) {
        throw new Error('Failed to get latest db credentials')
      }
      const creds = credsResponse.result

      this.pool = new pg.Pool({
        host: creds.host,
        user: creds.user,
        password: creds.password,
        database: creds.database,
        ssl: false,
      })
    }

    return this.pool
  }

  private isAuthError(err: unknown) {
    return err instanceof Error && (err as { code?: string }).code === '28P01'
  }

  private async rotate() {
    if (this.rotating) {
      return this.rotating
    }

    this.rotating = (async () => {
      try {
        await this.pool?.end().catch(() => {
          /* empty */
        })
        this.pool = undefined
        await this.ensurePool()
      } finally {
        this.rotating = undefined
      }
    })()

    return this.rotating
  }

  async query(text: string, params?: unknown[]): Promise<pg.QueryResult> {
    const pool = await this.ensurePool()

    try {
      return await pool.query(text, params)
    } catch (err: unknown) {
      if (!this.isAuthError(err)) {
        throw err
      }

      await this.rotate()
      return pool.query(text, params)
    }
  }

  async end() {
    await this.pool?.end()
  }
}

export const createLombokAppPgDatabase = <TDb extends Record<string, unknown>>(
  server: IAppPlatformService,
  schema: TDb,
): NodePgDatabase<TDb> => {
  const client = new LombokAppPgClient(server)
  return drizzle(client as unknown as NodePgClient, { schema })
}

export interface SerializeableRequest {
  url: string
  method: string
  headers: Record<string, string>
  body: string
}

export type RequestHandler = (
  request: Request,
  {
    serverClient,
    dbClient,
    createDb,
    actor,
  }: {
    serverClient: IAppPlatformService
    dbClient: LombokAppPgClient
    createDb: CreateDbFn
    actor: WorkerApiActor | undefined
  },
) => Promise<Response> | Response

export type TaskHandler = (
  task: TaskDTO,
  {
    serverClient,
    dbClient,
    createDb,
  }: {
    serverClient: IAppPlatformService
    dbClient: LombokAppPgClient
    createDb: CreateDbFn
  },
) => Promise<undefined> | undefined

export type CreateDbFn = <T extends Record<string, unknown>>(
  schema: T,
) => NodePgDatabase<T>
