import type {
  AppLogEntry,
  AppManifest,
  ContentMetadataType,
} from '@stellariscloud/types'
import type { Socket } from 'socket.io-client'

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
  subjectFolderId?: string
  subjectObjectKey?: string
}

export interface CoreServerMessageInterface {
  getServerBaseUrl: () => string
  getWorkerExecutionDetails: (
    appIdentifier: string,
    workerIdentifier: string,
  ) => Promise<
    AppAPIResponse<{
      payloadUrl: string
      workerToken: string
      envVars: Record<string, string>
    }>
  >
  getAppUIbundle: (
    appIdentifier: string,
    uiName: string,
  ) => Promise<AppAPIResponse<{ manifest: AppManifest; bundleUrl: string }>>
  saveLogEntry: (entry: AppLogEntry) => Promise<AppAPIResponse<boolean>>
  attemptStartHandleTaskById: (
    taskId: string,
    taskHandlerId?: string,
  ) => Promise<AppAPIResponse<AppTask>>
  attemptStartHandleTask: (
    taskIdentifiers: string[],
  ) => Promise<AppAPIResponse<AppTask>>
  failHandleTask: (
    taskId: string,
    error: { code: string; message: string },
  ) => Promise<AppAPIResponse<void>>
  completeHandleTask: (taskId: string) => Promise<AppAPIResponse<void>>
  getMetadataSignedUrls: (
    objects: {
      folderId: string
      objectKey: string
      contentHash: string
      metadataHash: string
      method: 'GET' | 'PUT' | 'DELETE'
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
      method: 'GET' | 'PUT' | 'DELETE'
    }[],
    eventId?: string,
  ) => Promise<
    AppAPIResponse<{
      urls: { url: string; folderId: string; objectKey: string }[]
    }>
  >
  updateContentMetadata: (
    updates: {
      folderId: string
      objectKey: string
      hash: string
      metadata: ContentMetadataType
    }[],
    eventId?: string,
  ) => Promise<AppAPIResponse<void>>
}

export const buildAppClient = (
  socket: Socket,
  serverBaseUrl: string,
): CoreServerMessageInterface => {
  const emitWithAck = async (name: string, data: unknown) => {
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
      }) as ReturnType<CoreServerMessageInterface['getWorkerExecutionDetails']>
    },
    getAppUIbundle(appIdentifier, uiName) {
      return emitWithAck('GET_APP_UI_BUNDLE', {
        appIdentifier,
        uiName,
      }) as ReturnType<CoreServerMessageInterface['getAppUIbundle']>
    },
    saveLogEntry(entry) {
      return emitWithAck('SAVE_LOG_ENTRY', entry) as ReturnType<
        CoreServerMessageInterface['saveLogEntry']
      >
    },
    getContentSignedUrls(requests) {
      return emitWithAck('GET_CONTENT_SIGNED_URLS', { requests }) as ReturnType<
        CoreServerMessageInterface['getContentSignedUrls']
      >
    },
    getMetadataSignedUrls(requests) {
      return emitWithAck('GET_METADATA_SIGNED_URLS', {
        requests,
      }) as ReturnType<CoreServerMessageInterface['getMetadataSignedUrls']>
    },
    updateContentMetadata(updates, taskId) {
      return emitWithAck('UPDATE_CONTENT_METADATA', {
        taskId,
        updates,
      }) as ReturnType<CoreServerMessageInterface['updateContentMetadata']>
    },
    completeHandleTask(taskId) {
      return emitWithAck('COMPLETE_HANDLE_TASK', taskId) as ReturnType<
        CoreServerMessageInterface['completeHandleTask']
      >
    },
    attemptStartHandleTaskById(taskId: string, taskHandlerId?: string) {
      return emitWithAck('ATTEMPT_START_HANDLE_TASK_BY_ID', {
        taskId,
        taskHandlerId,
      }) as ReturnType<CoreServerMessageInterface['attemptStartHandleTaskById']>
    },
    attemptStartHandleTask(taskIdentifiers: string[]) {
      return emitWithAck('ATTEMPT_START_HANDLE_TASK', {
        taskIdentifiers,
      }) as ReturnType<CoreServerMessageInterface['attemptStartHandleTask']>
    },
    failHandleTask(taskId, error) {
      return emitWithAck('FAIL_HANDLE_TASK', { taskId, error }) as ReturnType<
        CoreServerMessageInterface['failHandleTask']
      >
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
  { serverClient }: { serverClient: CoreServerMessageInterface },
) => Promise<SerializeableResponse> | SerializeableResponse

export type TaskHandler = (
  task: AppTask,
  { serverClient }: { serverClient: CoreServerMessageInterface },
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
