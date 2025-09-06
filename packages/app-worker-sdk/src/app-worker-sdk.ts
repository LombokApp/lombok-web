import type {
  AppLogEntry,
  AppManifest,
  AppSocketMessage,
  ContentMetadataType,
  EventDTO,
  SignedURLsRequestMethod,
  WorkerErrorDetails,
} from '@lombokapp/types'
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
  ) => Promise<AppAPIResponse<{ rows: unknown[]; fields: unknown[] }>>
  exec: (
    sql: string,
    params?: unknown[],
  ) => Promise<AppAPIResponse<{ rowCount: number }>>
  batch: (
    steps: { sql: string; params?: unknown[]; kind: 'query' | 'exec' }[],
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
    query(sql, params = []) {
      return emitWithAck('DB_QUERY', { sql, params }) as ReturnType<
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
  ) => Promise<{ rows: unknown[]; fields: unknown[] }>
  exec: (sql: string, params?: unknown[]) => Promise<{ rowCount: number }>
  batch: (
    steps: { sql: string; params?: unknown[]; kind: 'query' | 'exec' }[],
    atomic?: boolean,
  ) => Promise<{ results: unknown[] }>
}

export const buildDatabaseClient = (
  server: PlatformServerMessageInterface,
): DatabaseClient => {
  return {
    async query(sql, params = []) {
      return (await server.query(sql, params)).result
    },
    async exec(sql, params = []) {
      return (await server.exec(sql, params)).result
    },
    async batch(steps, atomic = false) {
      return (await server.batch(steps, atomic)).result
    },
  }
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
  }: { serverClient: PlatformServerMessageInterface; dbClient: DatabaseClient },
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
