import {
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
import type { Socket } from 'socket.io-client'
import type { z } from 'zod'

const DEFAULT_SOCKET_RESPONSE_TIMEOUT = 5000

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
  query: (
    params: AppSocketMessageDataMap['DB_QUERY'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'DB_QUERY'>>
  exec: (
    params: AppSocketMessageDataMap['DB_EXEC'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'DB_EXEC'>>
  batch: (
    params: AppSocketMessageDataMap['DB_BATCH'],
    options?: PlatformApiExecuteOptions,
  ) => Promise<SocketResponse<'DB_BATCH'>>
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
  const emitWithAck = async <K extends z.infer<typeof AppSocketMessage>>(
    name: K,
    data: AppSocketMessageDataMap[K],
    options: PlatformApiExecuteOptions = {},
  ): Promise<SocketResponse<K>> => {
    const timeoutMs =
      typeof options.timeoutMs === 'undefined'
        ? defaultTimeoutMs
        : options.timeoutMs
    const response = (await socket.timeout(timeoutMs).emitWithAck('APP_API', {
      name,
      data,
    })) as SocketResponse<K> | { error: AppSocketResponseError }

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
    query(params, options) {
      return emitWithAck('DB_QUERY', params, options)
    },
    exec(params, options) {
      return emitWithAck('DB_EXEC', params, options)
    },
    batch(params, options) {
      return emitWithAck('DB_BATCH', params, options)
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
        const response = await server.query({ sql, params, rowMode })
        if ('error' in response) {
          throw new AppAPIError(
            String(response.error.code),
            response.error.message,
          )
        }
        const result = response.result
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
        const response = await server.exec({ sql, params })
        if ('error' in response) {
          throw new AppAPIError(
            String(response.error.code),
            response.error.message,
          )
        }
        const result = response.result
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
        const response = await server.batch({ steps, atomic })
        if ('error' in response) {
          throw new AppAPIError(
            String(response.error.code),
            response.error.message,
          )
        }
        const result = response.result
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
  task: TaskDTO,
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
