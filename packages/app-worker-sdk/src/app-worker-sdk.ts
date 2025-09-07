import type {
  AppLogEntry,
  AppManifest,
  AppSocketMessage,
  ContentMetadataType,
  EventDTO,
  SignedURLsRequestMethod,
  WorkerErrorDetails,
} from '@lombokapp/types'
import type { NodePgDatabase } from 'drizzle-orm/node-postgres'
import type { Socket } from 'socket.io-client'
import type { z } from 'zod'

const SOCKET_RESPONSE_TIMEOUT = 2000

export class AppAPIError extends Error {
  errorCode: string
  constructor(errorCode: string, errorMessage = '') {
    super()
    this.errorCode = errorCode
    this.message = errorMessage
  }
}

interface AppAPIResponse<T> {
  result: T
  error?: { code: string; message: string }
}
export interface AppTask {
  id: string
  taskIdentifier: string
  inputData: unknown
  event: EventDTO
  subjectFolderId?: string
  subjectObjectKey?: string
}

export interface PlatformServerMessageInterface {
  getServerBaseUrl: () => string
  getWorkerExecutionDetails: (
    appIdentifier: string,
    workerIdentifier: string,
  ) => Promise<
    AppAPIResponse<{
      payloadUrl: string
      workerToken: string
      environmentVariables: Record<string, string>
      entrypoint: string
      hash: string
    }>
  >
  getAppUIbundle: (
    appIdentifier: string,
  ) => Promise<AppAPIResponse<{ manifest: AppManifest; bundleUrl: string }>>
  saveLogEntry: (entry: AppLogEntry) => Promise<AppAPIResponse<boolean>>
  attemptStartHandleTaskById: (
    taskId: string,
    taskHandlerId?: string,
  ) => Promise<AppAPIResponse<AppTask>>
  attemptStartHandleAnyAvailableTask: (
    taskIdentifiers: string[],
  ) => Promise<AppAPIResponse<AppTask>>
  failHandleTask: (
    taskId: string,
    error: {
      code: string
      message: string
      details?: WorkerErrorDetails
    },
  ) => Promise<AppAPIResponse<void>>
  completeHandleTask: (taskId: string) => Promise<AppAPIResponse<void>>
  authenticateUser: (
    token: string,
    appIdentifier: string,
  ) => Promise<AppAPIResponse<{ userId: string; success: boolean }>>
  getMetadataSignedUrls: (
    objects: {
      folderId: string
      objectKey: string
      contentHash: string
      metadataHash: string
      method: SignedURLsRequestMethod
    }[],
  ) => Promise<
    AppAPIResponse<{
      urls: { url: string; folderId: string; objectKey: string }[]
    }>
  >
  getContentSignedUrls: (
    objects: {
      folderId: string
      objectKey: string
      method: SignedURLsRequestMethod
    }[],
    eventId?: string,
  ) => Promise<
    AppAPIResponse<{
      urls: { url: string; folderId: string; objectKey: string }[]
    }>
  >
  getAppStorageSignedUrls: (
    requests: {
      objectKey: string
      method: SignedURLsRequestMethod
    }[],
  ) => Promise<AppAPIResponse<{ urls: string[] }>>
  updateContentMetadata: (
    updates: {
      folderId: string
      objectKey: string
      hash: string
      metadata: ContentMetadataType
    }[],
    eventId?: string,
  ) => Promise<AppAPIResponse<void>>
  // Database methods
  query: (
    sql: string,
    params?: unknown[],
    rowMode?: string,
  ) => Promise<AppAPIResponse<{ rows: unknown[]; fields: unknown[] }>>
  exec: (
    sql: string,
    params?: unknown[],
  ) => Promise<AppAPIResponse<{ rowCount: number }>>
  batch: (
    steps: {
      sql: string
      params?: unknown[]
      kind: 'query' | 'exec'
      rowMode?: string
    }[],
    atomic?: boolean,
  ) => Promise<AppAPIResponse<{ results: unknown[] }>>
}

export const buildAppClient = (
  socket: Socket,
  serverBaseUrl: string,
): PlatformServerMessageInterface => {
  const emitWithAck = async (
    name: z.infer<typeof AppSocketMessage>,
    data: unknown,
  ) => {
    const response = (await socket
      .timeout(SOCKET_RESPONSE_TIMEOUT)
      .emitWithAck('APP_API', {
        name,
        data,
      })) as AppAPIResponse<unknown>
    if (response.error) {
      throw new AppAPIError(response.error.code, response.error.message)
    }
    return response
  }

  return {
    getServerBaseUrl() {
      return serverBaseUrl
    },
    getWorkerExecutionDetails(appIdentifier, workerIdentifier) {
      return emitWithAck('GET_WORKER_EXECUTION_DETAILS', {
        appIdentifier,
        workerIdentifier,
      }) as ReturnType<
        PlatformServerMessageInterface['getWorkerExecutionDetails']
      >
    },
    getAppUIbundle(appIdentifier) {
      return emitWithAck('GET_APP_UI_BUNDLE', {
        appIdentifier,
      }) as ReturnType<PlatformServerMessageInterface['getAppUIbundle']>
    },
    saveLogEntry(entry) {
      return emitWithAck('SAVE_LOG_ENTRY', entry) as ReturnType<
        PlatformServerMessageInterface['saveLogEntry']
      >
    },
    getContentSignedUrls(requests) {
      return emitWithAck('GET_CONTENT_SIGNED_URLS', { requests }) as ReturnType<
        PlatformServerMessageInterface['getContentSignedUrls']
      >
    },
    getMetadataSignedUrls(requests) {
      return emitWithAck('GET_METADATA_SIGNED_URLS', {
        requests,
      }) as ReturnType<PlatformServerMessageInterface['getMetadataSignedUrls']>
    },
    getAppStorageSignedUrls(requests) {
      return emitWithAck('GET_APP_STORAGE_SIGNED_URLS', {
        requests,
      }) as ReturnType<
        PlatformServerMessageInterface['getAppStorageSignedUrls']
      >
    },
    updateContentMetadata(updates, taskId) {
      return emitWithAck('UPDATE_CONTENT_METADATA', {
        taskId,
        updates,
      }) as ReturnType<PlatformServerMessageInterface['updateContentMetadata']>
    },
    completeHandleTask(taskId) {
      return emitWithAck('COMPLETE_HANDLE_TASK', { taskId }) as ReturnType<
        PlatformServerMessageInterface['completeHandleTask']
      >
    },
    authenticateUser(token, appIdentifier) {
      return emitWithAck('AUTHENTICATE_USER', {
        token,
        appIdentifier,
      }) as ReturnType<PlatformServerMessageInterface['authenticateUser']>
    },
    attemptStartHandleTaskById(taskId: string, taskHandlerId?: string) {
      return emitWithAck('ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID', {
        taskId,
        taskHandlerId,
      }) as ReturnType<
        PlatformServerMessageInterface['attemptStartHandleTaskById']
      >
    },
    attemptStartHandleAnyAvailableTask(taskIdentifiers: string[]) {
      return emitWithAck('ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK', {
        taskIdentifiers,
      }) as ReturnType<
        PlatformServerMessageInterface['attemptStartHandleAnyAvailableTask']
      >
    },
    failHandleTask(taskId, error) {
      return emitWithAck('FAIL_HANDLE_TASK', { taskId, error }) as ReturnType<
        PlatformServerMessageInterface['failHandleTask']
      >
    },
    // Database methods
    query(sql, params, rowMode) {
      return emitWithAck('DB_QUERY', { sql, params, rowMode }) as ReturnType<
        PlatformServerMessageInterface['query']
      >
    },
    exec(sql, params = []) {
      return emitWithAck('DB_EXEC', { sql, params }) as ReturnType<
        PlatformServerMessageInterface['exec']
      >
    },
    batch(steps, atomic = false) {
      return emitWithAck('DB_BATCH', { steps, atomic }) as ReturnType<
        PlatformServerMessageInterface['batch']
      >
    },
  }
}

export interface DatabaseClient {
  query: (
    sql: string,
    params?: unknown[],
    rowMode?: string,
  ) => Promise<{ rows: unknown[]; fields: unknown[] }>
  exec: (sql: string, params?: unknown[]) => Promise<{ rowCount: number }>
  batch: (
    steps: {
      sql: string
      params?: unknown[]
      kind: 'query' | 'exec'
      rowMode?: string
    }[],
    atomic?: boolean,
  ) => Promise<{ results: unknown[] }>
}

export const buildDatabaseClient = (
  server: PlatformServerMessageInterface,
): DatabaseClient => {
  return {
    async query(sql, params, rowMode) {
      const startTime = Date.now()
      const paramsStr =
        params && params.length > 0
          ? ` | Params: ${JSON.stringify(params)}`
          : ''

      try {
        const result = (await server.query(sql, params, rowMode)).result
        const duration = Date.now() - startTime
        console.log(`[DB Query] [${duration}ms] ${sql}${paramsStr}`)
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        console.log(
          `[DB Query] [${duration}ms] FAILED: ${sql}${paramsStr} | Error: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
        )
        throw error
      }
    },
    async exec(sql, params = []) {
      const startTime = Date.now()
      const paramsStr =
        params.length > 0 ? ` | Params: ${JSON.stringify(params)}` : ''

      try {
        const result = (await server.exec(sql, params)).result
        const duration = Date.now() - startTime
        console.log(`[DB Exec] [${duration}ms] ${sql}${paramsStr}`)
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        console.log(
          `[DB Exec] [${duration}ms] FAILED: ${sql}${paramsStr} | Error: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
        )
        throw error
      }
    },
    async batch(steps, atomic = false) {
      const startTime = Date.now()
      const stepsStr = steps
        .map((step, index) => {
          const paramsStr =
            step.params && step.params.length > 0
              ? ` | Params: ${JSON.stringify(step.params)}`
              : ''
          return `Step ${index + 1}: ${step.sql}${paramsStr}`
        })
        .join('; ')

      try {
        const result = (await server.batch(steps, atomic)).result
        const duration = Date.now() - startTime
        console.log(
          `[DB Batch] [${duration}ms] ${steps.length} steps (atomic: ${atomic}) | ${stepsStr}`,
        )
        return result
      } catch (error) {
        const duration = Date.now() - startTime
        console.log(
          `[DB Batch] [${duration}ms] FAILED: ${steps.length} steps (atomic: ${atomic}) | ${stepsStr} | Error: ${error instanceof Error ? `${error.name}: ${error.message}` : String(error)}`,
        )
        throw error
      }
    },
  }
}

export class DrizzlePgLike {
  constructor(private readonly client: DatabaseClient) {}

  // what drizzle needs for queries
  async query<T = unknown>(
    sql: { text: string; rowMode?: string; types?: Record<string, unknown> },
    params?: unknown[],
  ): Promise<{ rows: T[] }> {
    // Handle both string and query object formats
    const actualParams = params || []
    const rowMode = sql.rowMode

    // Treat SELECT and statements with RETURNING as row-returning
    const returnsRows = /(^\s*select\b)|\breturning\b/i.test(sql.text)
    if (returnsRows) {
      const res = await this.client.query(sql.text, actualParams, rowMode)
      return { rows: res.rows as T[] }
    } else {
      await this.client.exec(sql.text, actualParams)
      // drizzle ignores rowCount in many cases; returning empty rows is fine
      return { rows: [] as T[] }
    }
  }

  // optional: a transaction hook so `db.transaction(async (tx)=>{})` works
  async transaction<T>(fn: (tx: DrizzlePgLike) => Promise<T>): Promise<T> {
    const steps: {
      sql: string
      params?: unknown[]
      kind: 'query' | 'exec'
      rowMode?: string
    }[] = []
    // Provide a tx-scoped client that records steps instead of sending immediately
    const txClient = new (class extends DrizzlePgLike {
      query<TRow = unknown>(
        sql: {
          text: string
          rowMode?: string
          types?: Record<string, unknown>
        },
        params?: unknown[],
      ): Promise<{ rows: TRow[] }> {
        // Handle both string and query object formats
        const actualParams = params || []
        const rowMode = typeof sql === 'object' ? sql.rowMode : undefined

        const kind = /(^\s*select\b)|\breturning\b/i.test(sql.text)
          ? 'query'
          : 'exec'
        steps.push({ sql: sql.text, params: actualParams, kind, rowMode })
        return Promise.resolve({ rows: [] as TRow[] })
      }
    })(this.client)

    const result = await fn(txClient)
    await this.client.batch(steps, /*atomic*/ true)
    return result
  }
}

// Accept the user's chosen drizzle factory (from any pg-compatible driver)
// and wrap our DatabaseClient so it can be used directly.
export const createDrizzle = <
  TDb extends Record<string, unknown> = Record<string, unknown>,
>(
  drizzleFactory: (client: unknown, options?: unknown) => NodePgDatabase<TDb>,
  client: DatabaseClient,
  options?: { schema: TDb },
): NodePgDatabase<TDb> => {
  const pgLike = new DrizzlePgLike(client)
  return drizzleFactory(pgLike as unknown, options)
}

export interface SerializeableResponse {
  body: string
  status: number
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
    userId,
  }: {
    serverClient: PlatformServerMessageInterface
    dbClient: DatabaseClient
    userId?: string
  },
) => Promise<SerializeableResponse> | SerializeableResponse

export type TaskHandler = (
  task: AppTask,
  {
    serverClient,
    dbClient,
  }: { serverClient: PlatformServerMessageInterface; dbClient: DatabaseClient },
) => Promise<undefined> | undefined

export const sendResponse = (
  body: unknown,
  status = 200,
): SerializeableResponse => {
  return {
    body: JSON.stringify(body),
    status,
  }
}
