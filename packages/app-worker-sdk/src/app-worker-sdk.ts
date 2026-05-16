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
import { z } from 'zod'

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
  saveLogEntry: (
    entry: AppSocketMessageDataMap['SAVE_LOG_ENTRY'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'SAVE_LOG_ENTRY'>>
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
  mintAppUserToken: (
    params: AppSocketMessageDataMap['MINT_APP_USER_TOKEN'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'MINT_APP_USER_TOKEN'>>
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
  executeAppDockerJobAsync: (
    params: AppSocketMessageDataMap['EXECUTE_APP_DOCKER_JOB_ASYNC'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'EXECUTE_APP_DOCKER_JOB_ASYNC'>>
  getAppTask: (
    params: AppSocketMessageDataMap['GET_APP_TASK'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'GET_APP_TASK'>>
  triggerAppTask: (
    params: AppSocketMessageDataMap['TRIGGER_APP_TASK'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'TRIGGER_APP_TASK'>>
  reportTaskProgress: (
    params: AppSocketMessageDataMap['REPORT_TASK_PROGRESS'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'REPORT_TASK_PROGRESS'>>
  getAppCustomSettings: (
    params: AppSocketMessageDataMap['GET_APP_CUSTOM_SETTINGS'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'GET_APP_CUSTOM_SETTINGS'>>
  patchAppCustomSettings: (
    params: AppSocketMessageDataMap['PATCH_APP_CUSTOM_SETTINGS'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'PATCH_APP_CUSTOM_SETTINGS'>>
  createBridgeTunnel: (
    params: AppSocketMessageDataMap['CREATE_BRIDGE_TUNNEL'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'CREATE_BRIDGE_TUNNEL'>>
  deleteBridgeTunnel: (
    params: AppSocketMessageDataMap['DELETE_BRIDGE_TUNNEL'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'DELETE_BRIDGE_TUNNEL'>>
  destroyAppDockerContainers: (
    params: AppSocketMessageDataMap['DESTROY_APP_DOCKER_CONTAINERS'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'DESTROY_APP_DOCKER_CONTAINERS'>>
  /**
   * Resolve the live container running for a (profile, isolationKey) pair.
   * Returns the running container's `{hostId, containerId}` or `null` if no
   * matching container is currently running. Useful for class-isolated
   * profiles where the runtime needs to reach a container it earlier asked
   * the platform to spin up but doesn't want to cache the pointer itself.
   */
  resolveAppDockerContainer: (
    params: AppSocketMessageDataMap['RESOLVE_APP_DOCKER_CONTAINER'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'RESOLVE_APP_DOCKER_CONTAINER'>>
  registerAppTrigger: (
    params: AppSocketMessageDataMap['REGISTER_APP_TRIGGER'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'REGISTER_APP_TRIGGER'>>
  unregisterAppTrigger: (
    params: AppSocketMessageDataMap['UNREGISTER_APP_TRIGGER'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'UNREGISTER_APP_TRIGGER'>>
  listAppTriggers: (
    params: AppSocketMessageDataMap['LIST_APP_TRIGGERS'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'LIST_APP_TRIGGERS'>>
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
          error: parsedError.data,
        } as SocketResponse<K>
      }
      return {
        error: {
          code: 'APP_API_ERROR',
          message: 'Failed to parse response',
          details: {
            errors: z.flattenError(parsedError.error).fieldErrors,
          },
        },
      } as SocketResponse<K>
    }

    const parsedResponse =
      AppSocketMessageResponseSchemaMap[name].safeParse(response)

    if (!parsedResponse.success) {
      return {
        error: {
          code: 'APP_API_ERROR',
          message: 'Failed to parse response',
          details: {
            errors: z.flattenError(
              parsedResponse.error as unknown as z.core.$ZodError,
            ).fieldErrors,
          },
        },
      } as SocketResponse<K>
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
    mintAppUserToken(params, options) {
      return emitWithAck('MINT_APP_USER_TOKEN', params, options)
    },
    updateContentMetadata(params, options) {
      return emitWithAck('UPDATE_CONTENT_METADATA', params, options)
    },
    executeAppDockerJob(params, options) {
      return emitWithAck('EXECUTE_APP_DOCKER_JOB', params, options)
    },
    executeAppDockerJobAsync(params, options) {
      return emitWithAck('EXECUTE_APP_DOCKER_JOB_ASYNC', params, options)
    },
    getAppTask(params, options) {
      return emitWithAck('GET_APP_TASK', params, options)
    },
    triggerAppTask(params, options) {
      return emitWithAck('TRIGGER_APP_TASK', params, options)
    },
    getLatestDbCredentials(options) {
      return emitWithAck('GET_LATEST_DB_CREDENTIALS', options)
    },
    reportTaskProgress(params, options) {
      return emitWithAck('REPORT_TASK_PROGRESS', params, options)
    },
    getAppCustomSettings(params, options) {
      return emitWithAck('GET_APP_CUSTOM_SETTINGS', params, options)
    },
    patchAppCustomSettings(params, options) {
      return emitWithAck('PATCH_APP_CUSTOM_SETTINGS', params, options)
    },
    createBridgeTunnel(params, options) {
      return emitWithAck('CREATE_BRIDGE_TUNNEL', params, options)
    },
    deleteBridgeTunnel(params, options) {
      return emitWithAck('DELETE_BRIDGE_TUNNEL', params, options)
    },
    destroyAppDockerContainers(params, options) {
      return emitWithAck('DESTROY_APP_DOCKER_CONTAINERS', params, options)
    },
    resolveAppDockerContainer(params, options) {
      return emitWithAck('RESOLVE_APP_DOCKER_CONTAINER', params, options)
    },
    registerAppTrigger(params, options) {
      return emitWithAck('REGISTER_APP_TRIGGER', params, options)
    },
    unregisterAppTrigger(params, options) {
      return emitWithAck('UNREGISTER_APP_TRIGGER', params, options)
    },
    listAppTriggers(params, options) {
      return emitWithAck('LIST_APP_TRIGGERS', params, options)
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
        // Surface connection-acquire deadlocks loudly. Without this, a tx
        // callback that triggers a second pool checkout (directly or via a
        // helper that uses the pool client instead of the tx) hangs
        // forever; with it, the second checkout throws after 10s.
        connectionTimeoutMillis: 10_000,
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

  // Drizzle's transaction() checks `client instanceof Pool ||
  // constructor.name.includes('Pool')` to decide whether to acquire a
  // single connection for BEGIN/COMMIT. Without this, every query inside
  // db.transaction() is routed through a separate pool checkout — any
  // concurrent query (e.g. Promise.all) splits connections, the COMMIT
  // lands on a non-tx checkout, and the in-tx connection's writes get
  // rolled back when it idles. So we hand drizzle a real PoolClient.
  async connect(): Promise<pg.PoolClient> {
    const pool = await this.ensurePool()
    return pool.connect()
  }

  async end() {
    await this.pool?.end()
  }
}

// Make drizzle's `constructor.name.includes('Pool')` check pass without
// renaming the public class — see the comment on `connect()` above.
Object.defineProperty(LombokAppPgClient, 'name', {
  value: 'LombokAppPgClientPool',
})

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
