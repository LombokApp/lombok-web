import type {
  AppLogEntry,
  AppManifest,
  AppSocketMessage,
  AppSocketMessageDataMap,
  EventDTO,
  TaskDTO,
  WorkerApiActor,
} from '@lombokapp/types'
import {
  drizzle,
  type NodePgClient,
  type NodePgDatabase,
} from 'drizzle-orm/node-postgres'
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
export interface IAppPlatformService {
  getServerBaseUrl: () => string
  emitEvent: (
    params: AppSocketMessageDataMap['EMIT_EVENT'],
  ) => Promise<AppAPIResponse<void>>
  getWorkerExecutionDetails: (
    params: AppSocketMessageDataMap['GET_WORKER_EXECUTION_DETAILS'],
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
    params: AppSocketMessageDataMap['GET_APP_UI_BUNDLE'],
  ) => Promise<
    AppAPIResponse<{ manifest: AppManifest; bundleUrl: string; csp?: string }>
  >
  saveLogEntry: (entry: AppLogEntry) => Promise<AppAPIResponse<boolean>>
  attemptStartHandleTaskById: (
    params: AppSocketMessageDataMap['ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID'],
  ) => Promise<AppAPIResponse<{ task: TaskDTO; event: EventDTO }>>
  attemptStartHandleAnyAvailableTask: (
    params: AppSocketMessageDataMap['ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK'],
  ) => Promise<AppAPIResponse<{ task: TaskDTO; event: EventDTO }>>
  failHandleTask: (
    params: AppSocketMessageDataMap['FAIL_HANDLE_TASK'],
  ) => Promise<AppAPIResponse<void>>
  completeHandleTask: (
    params: AppSocketMessageDataMap['COMPLETE_HANDLE_TASK'],
  ) => Promise<AppAPIResponse<void>>
  authenticateUser: (
    params: AppSocketMessageDataMap['AUTHENTICATE_USER'],
  ) => Promise<AppAPIResponse<{ userId: string; success: boolean }>>
  getMetadataSignedUrls: (
    params: AppSocketMessageDataMap['GET_METADATA_SIGNED_URLS'],
  ) => Promise<
    AppAPIResponse<{ url: string; folderId: string; objectKey: string }[]>
  >
  getContentSignedUrls: (
    params: AppSocketMessageDataMap['GET_CONTENT_SIGNED_URLS'],
  ) => Promise<
    AppAPIResponse<{ url: string; folderId: string; objectKey: string }[]>
  >
  getAppStorageSignedUrls: (
    params: AppSocketMessageDataMap['GET_APP_STORAGE_SIGNED_URLS'],
  ) => Promise<AppAPIResponse<string[]>>
  getAppUserAccessToken: (
    params: AppSocketMessageDataMap['GET_APP_USER_ACCESS_TOKEN'],
  ) => Promise<AppAPIResponse<{ accessToken: string; refreshToken: string }>>
  updateContentMetadata: (
    params: AppSocketMessageDataMap['UPDATE_CONTENT_METADATA'],
  ) => Promise<AppAPIResponse<void>>
  // Database methods
  query: (
    params: AppSocketMessageDataMap['DB_QUERY'],
  ) => Promise<AppAPIResponse<{ rows: unknown[]; fields: unknown[] }>>
  exec: (
    params: AppSocketMessageDataMap['DB_EXEC'],
  ) => Promise<AppAPIResponse<{ rowCount: number }>>
  batch: (
    params: AppSocketMessageDataMap['DB_BATCH'],
  ) => Promise<AppAPIResponse<{ results: unknown[] }>>
  executeDockerJob: (
    params: AppSocketMessageDataMap['EXECUTE_APP_DOCKER_JOB'],
  ) => Promise<
    AppAPIResponse<{ jobId: string; success: boolean; result: unknown }>
  >
  queueAppTask: (
    params: AppSocketMessageDataMap['QUEUE_APP_TASK'],
  ) => Promise<AppAPIResponse<void>>
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
    emitEvent(params) {
      return emitWithAck('EMIT_EVENT', params) as ReturnType<
        IAppPlatformService['emitEvent']
      >
    },
    getWorkerExecutionDetails(params) {
      return emitWithAck('GET_WORKER_EXECUTION_DETAILS', params) as ReturnType<
        IAppPlatformService['getWorkerExecutionDetails']
      >
    },
    getAppUIbundle(params) {
      return emitWithAck('GET_APP_UI_BUNDLE', params) as ReturnType<
        IAppPlatformService['getAppUIbundle']
      >
    },
    saveLogEntry(params) {
      return emitWithAck('SAVE_LOG_ENTRY', params) as ReturnType<
        IAppPlatformService['saveLogEntry']
      >
    },
    getContentSignedUrls(params) {
      return emitWithAck('GET_CONTENT_SIGNED_URLS', params) as ReturnType<
        IAppPlatformService['getContentSignedUrls']
      >
    },
    getMetadataSignedUrls(requests) {
      return emitWithAck('GET_METADATA_SIGNED_URLS', {
        requests,
      }) as ReturnType<IAppPlatformService['getMetadataSignedUrls']>
    },
    getAppStorageSignedUrls(params) {
      return emitWithAck('GET_APP_STORAGE_SIGNED_URLS', {
        params,
      }) as ReturnType<IAppPlatformService['getAppStorageSignedUrls']>
    },
    getAppUserAccessToken(params) {
      return emitWithAck('GET_APP_USER_ACCESS_TOKEN', params) as ReturnType<
        IAppPlatformService['getAppUserAccessToken']
      >
    },
    updateContentMetadata(params) {
      return emitWithAck('UPDATE_CONTENT_METADATA', params) as ReturnType<
        IAppPlatformService['updateContentMetadata']
      >
    },
    completeHandleTask(params) {
      return emitWithAck('COMPLETE_HANDLE_TASK', params) as ReturnType<
        IAppPlatformService['completeHandleTask']
      >
    },
    authenticateUser(params) {
      return emitWithAck('AUTHENTICATE_USER', params) as ReturnType<
        IAppPlatformService['authenticateUser']
      >
    },
    attemptStartHandleTaskById(params) {
      return emitWithAck(
        'ATTEMPT_START_HANDLE_WORKER_TASK_BY_ID',
        params,
      ) as ReturnType<IAppPlatformService['attemptStartHandleTaskById']>
    },
    attemptStartHandleAnyAvailableTask(params) {
      return emitWithAck(
        'ATTEMPT_START_HANDLE_ANY_AVAILABLE_TASK',
        params,
      ) as ReturnType<IAppPlatformService['attemptStartHandleAnyAvailableTask']>
    },
    failHandleTask(params) {
      return emitWithAck('FAIL_HANDLE_TASK', params) as ReturnType<
        IAppPlatformService['failHandleTask']
      >
    },
    // Database methods
    query(params) {
      return emitWithAck('DB_QUERY', params) as ReturnType<
        IAppPlatformService['query']
      >
    },
    exec(params) {
      return emitWithAck('DB_EXEC', params) as ReturnType<
        IAppPlatformService['exec']
      >
    },
    batch(params) {
      return emitWithAck('DB_BATCH', params) as ReturnType<
        IAppPlatformService['batch']
      >
    },
    executeDockerJob(params) {
      return emitWithAck('EXECUTE_APP_DOCKER_JOB', params) as ReturnType<
        IAppPlatformService['executeDockerJob']
      >
    },
    queueAppTask(params) {
      return emitWithAck('QUEUE_APP_TASK', params) as ReturnType<
        IAppPlatformService['queueAppTask']
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
      params: unknown[]
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
    async query(sql, params = [], rowMode = undefined) {
      const startTime = Date.now()
      const paramsStr =
        params.length > 0 ? ` | Params: ${JSON.stringify(params)}` : ''

      try {
        const result = (await server.query({ sql, params, rowMode })).result
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
        const result = (await server.exec({ sql, params })).result
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
            step.params.length > 0
              ? ` | Params: ${JSON.stringify(step.params)}`
              : ''
          return `Step ${index + 1}: ${step.sql}${paramsStr}`
        })
        .join('; ')

      try {
        const result = (await server.batch({ steps, atomic })).result
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

/**
 * Minimal interface that documents what Drizzle ORM actually needs from a client.
 * This is the contract that Drizzle uses, even though it types it as NodePgClient
 * (which is a union of concrete pg classes).
 */
interface DrizzleCompatibleClient {
  query: (
    query:
      | string
      | { text: string; rowMode?: string; types?: Record<string, unknown> },
    params?: unknown[],
  ) => Promise<{ rows: unknown[] }>
  transaction?: <T>(
    fn: (tx: DrizzleCompatibleClient) => Promise<T>,
  ) => Promise<T>
}

export class DrizzlePgLike implements DrizzleCompatibleClient {
  constructor(private readonly client: DatabaseClient) {}

  // what drizzle needs for queries
  async query<T = unknown>(
    sql:
      | string
      | { text: string; rowMode?: string; types?: Record<string, unknown> },
    params?: unknown[],
  ): Promise<{ rows: T[] }> {
    // Handle both string and query object formats
    const actualParams = params || []
    const queryText = typeof sql === 'string' ? sql : sql.text
    const rowMode = typeof sql === 'object' ? sql.rowMode : undefined

    // Treat SELECT and statements with RETURNING as row-returning
    const returnsRows = /(^\s*select\b)|\breturning\b/i.test(queryText)
    if (returnsRows) {
      const res = await this.client.query(queryText, actualParams, rowMode)
      // Parse date fields based on field metadata
      const parsedRows = this.parseRowsWithDates(res.rows, res.fields)
      return { rows: parsedRows as T[] }
    } else {
      await this.client.exec(queryText, actualParams)
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
      params: unknown[]
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
export const createDrizzle = <TDb extends Record<string, unknown>>(
  server: IAppPlatformService,
  schema: TDb,
): NodePgDatabase<TDb> => {
  const client = buildDatabaseClient(server)
  // DrizzlePgLike implements DrizzleCompatibleClient, which has all the methods
  // that Drizzle actually uses. We still need the type assertion because
  // NodePgClient is a union of concrete pg classes, not an interface.
  const pgLike: DrizzleCompatibleClient = new DrizzlePgLike(client)
  return drizzle(pgLike as unknown as NodePgClient, { schema })
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
    dbClient: DatabaseClient
    createDb: CreateDbFn
    actor: WorkerApiActor | undefined
  },
) => Promise<Response> | Response

export type TaskHandler = (
  { task, event }: { task: TaskDTO; event: EventDTO },
  {
    serverClient,
    dbClient,
    createDb,
  }: {
    serverClient: IAppPlatformService
    dbClient: DatabaseClient
    createDb: CreateDbFn
  },
) => Promise<undefined> | undefined

export type CreateDbFn = <T extends Record<string, unknown>>(
  schema: T,
) => NodePgDatabase<T>
