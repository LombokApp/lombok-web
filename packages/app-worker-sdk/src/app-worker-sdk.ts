import type {
  AppLogEntry,
  AppManifest,
  AppSocketMessage,
  ContentMetadataType,
  EventDTO,
  LombokApiClient,
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

export interface IAppPlatformService {
  getServerBaseUrl: () => string
  emitEvent: (
    eventIdentifier: string,
    data: unknown,
  ) => Promise<AppAPIResponse<void>>
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
  getAppUserAccessToken: (
    userId: string,
  ) => Promise<AppAPIResponse<{ accessToken: string; refreshToken: string }>>
  updateContentMetadata: (
    updates: {
      folderId: string
      objectKey: string
      hash: string
      metadata: ContentMetadataType
    }[],
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
): IAppPlatformService => {
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
    emitEvent(eventIdentifier, data) {
      return emitWithAck('EMIT_EVENT', { eventIdentifier, data }) as ReturnType<
        IAppPlatformService['emitEvent']
      >
    },
    getWorkerExecutionDetails(appIdentifier, workerIdentifier) {
      return emitWithAck('GET_WORKER_EXECUTION_DETAILS', {
        appIdentifier,
        workerIdentifier,
      }) as ReturnType<IAppPlatformService['getWorkerExecutionDetails']>
    },
    getAppUIbundle(appIdentifier) {
      return emitWithAck('GET_APP_UI_BUNDLE', {
        appIdentifier,
      }) as ReturnType<IAppPlatformService['getAppUIbundle']>
    },
    saveLogEntry(entry) {
      return emitWithAck('SAVE_LOG_ENTRY', entry) as ReturnType<
        IAppPlatformService['saveLogEntry']
      >
    },
    getContentSignedUrls(requests) {
      return emitWithAck('GET_CONTENT_SIGNED_URLS', { requests }) as ReturnType<
        IAppPlatformService['getContentSignedUrls']
      >
    },
    getMetadataSignedUrls(requests) {
      return emitWithAck('GET_METADATA_SIGNED_URLS', {
        requests,
      }) as ReturnType<IAppPlatformService['getMetadataSignedUrls']>
    },
    getAppStorageSignedUrls(requests) {
      return emitWithAck('GET_APP_STORAGE_SIGNED_URLS', {
        requests,
      }) as ReturnType<IAppPlatformService['getAppStorageSignedUrls']>
    },
    getAppUserAccessToken(userId) {
      return emitWithAck('GET_APP_USER_ACCESS_TOKEN', {
        userId,
      }) as ReturnType<IAppPlatformService['getAppUserAccessToken']>
    },
    updateContentMetadata(updates) {
      return emitWithAck('UPDATE_CONTENT_METADATA', {
        updates,
      }) as ReturnType<IAppPlatformService['updateContentMetadata']>
    },
    completeHandleTask(taskId) {
      return emitWithAck('COMPLETE_HANDLE_TASK', { taskId }) as ReturnType<
        IAppPlatformService['completeHandleTask']
      >
    },
    authenticateUser(token, appIdentifier) {
      return emitWithAck('AUTHENTICATE_USER', {
        token,
        appIdentifier,
      }) as ReturnType<IAppPlatformService['authenticateUser']>
    },
    attemptStartHandleTaskById(taskId: string, taskHandlerId?: string) {
      return emitWithAck('ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID', {
        taskId,
        taskHandlerId,
      }) as ReturnType<IAppPlatformService['attemptStartHandleTaskById']>
    },
    attemptStartHandleAnyAvailableTask(taskIdentifiers: string[]) {
      return emitWithAck('ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK', {
        taskIdentifiers,
      }) as ReturnType<
        IAppPlatformService['attemptStartHandleAnyAvailableTask']
      >
    },
    failHandleTask(taskId, error) {
      return emitWithAck('FAIL_HANDLE_TASK', { taskId, error }) as ReturnType<
        IAppPlatformService['failHandleTask']
      >
    },
    // Database methods
    query(sql, params, rowMode) {
      return emitWithAck('DB_QUERY', { sql, params, rowMode }) as ReturnType<
        IAppPlatformService['query']
      >
    },
    exec(sql, params = []) {
      return emitWithAck('DB_EXEC', { sql, params }) as ReturnType<
        IAppPlatformService['exec']
      >
    },
    batch(steps, atomic = false) {
      return emitWithAck('DB_BATCH', { steps, atomic }) as ReturnType<
        IAppPlatformService['batch']
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
  server: IAppPlatformService,
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
      // Parse date fields based on field metadata
      const parsedRows = this.parseRowsWithDates(res.rows, res.fields)
      return { rows: parsedRows as T[] }
    } else {
      await this.client.exec(sql.text, actualParams)
      // drizzle ignores rowCount in many cases; returning empty rows is fine
      return { rows: [] as T[] }
    }
  }

  /**
   * Parse rows and convert timestamp strings to Date objects based on field metadata
   */
  private parseRowsWithDates(rows: unknown[], fields: unknown[]): unknown[] {
    if (rows.length === 0) {
      return rows
    }

    if (fields.length === 0) {
      return rows
    }

    // Create a map of field indices to their data types
    const fieldTypeMap = new Map<number, number>()
    fields.forEach((field: unknown, index: number) => {
      if (field && typeof field === 'object' && 'dataTypeID' in field) {
        const fieldObj = field as { dataTypeID: number }
        fieldTypeMap.set(index, fieldObj.dataTypeID)
      }
    })

    // Parse each row
    return rows.map((row: unknown) => {
      if (!row || typeof row !== 'object') {
        return row
      }

      // Handle array format (rowMode: 'array')
      if (Array.isArray(row)) {
        return row.map((value: unknown, index: number) => {
          const dataTypeID = fieldTypeMap.get(index)
          return this.parseValueByType(value, dataTypeID)
        })
      }

      // Handle object format (rowMode: 'object')
      const parsedRow: Record<string, unknown> = {}
      const rowObj = row as Record<string, unknown>
      Object.keys(rowObj).forEach((key, index) => {
        const value = rowObj[key]
        const dataTypeID = fieldTypeMap.get(index)
        parsedRow[key] = this.parseValueByType(value, dataTypeID)
      })
      return parsedRow
    })
  }

  /**
   * Parse a value based on PostgreSQL data type ID
   */
  private parseValueByType(value: unknown, dataTypeID?: number): unknown {
    if (value === null || value === undefined) {
      return value
    }

    // PostgreSQL timestamp types (1114 = timestamp, 1184 = timestamptz)
    if (dataTypeID === 1114 || dataTypeID === 1184) {
      if (typeof value === 'string') {
        const date = new Date(value)
        // Return null if the date is invalid
        return isNaN(date.getTime()) ? null : date
      }
    }

    return value
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
    const batchResult = await this.client.batch(steps, /*atomic*/ true)

    // Parse any returned rows from batch operations
    if (Array.isArray(batchResult.results)) {
      const parsedResults = batchResult.results.map((stepResult: unknown) => {
        if (
          stepResult &&
          typeof stepResult === 'object' &&
          'rows' in stepResult &&
          'fields' in stepResult
        ) {
          const resultObj = stepResult as { rows: unknown[]; fields: unknown[] }
          return {
            ...resultObj,
            rows: this.parseRowsWithDates(resultObj.rows, resultObj.fields),
          }
        }
        return stepResult
      })
      batchResult.results = parsedResults
    }

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
    user,
  }: {
    serverClient: IAppPlatformService
    dbClient: DatabaseClient
    user?: {
      userId: string
      userApiClient: LombokApiClient
    }
  },
) => Promise<SerializeableResponse> | SerializeableResponse

export type TaskHandler = (
  task: AppTask,
  {
    serverClient,
    dbClient,
  }: { serverClient: IAppPlatformService; dbClient: DatabaseClient },
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
