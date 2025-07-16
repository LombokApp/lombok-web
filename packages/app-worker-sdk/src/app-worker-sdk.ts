import { AppLogEntry, ContentMetadataType } from '@stellariscloud/types'
import type { Socket } from 'socket.io-client'

const SOCKET_RESPONSE_TIMEOUT = 2000

export const buildAppClient = (
  socket: Socket,
  serverBaseUrl: string,
): CoreServerMessageInterface => {
  const emitWithAck = async (name: string, data: any) => {
    const response = await socket
      .timeout(SOCKET_RESPONSE_TIMEOUT)
      .emitWithAck('APP_API', {
        name,
        data,
      })
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
      })
    },
    saveLogEntry(entry) {
      return emitWithAck('SAVE_LOG_ENTRY', entry)
    },
    getContentSignedUrls(requests) {
      return emitWithAck('GET_CONTENT_SIGNED_URLS', { requests })
    },
    getMetadataSignedUrls(requests) {
      return emitWithAck('GET_METADATA_SIGNED_URLS', { requests })
    },
    updateContentMetadata(updates, taskId) {
      return emitWithAck('UPDATE_CONTENT_METADATA', { taskId, updates })
    },
    completeHandleTask(taskId) {
      return emitWithAck('COMPLETE_HANDLE_TASK', taskId)
    },
    attemptStartHandleTaskById(taskId: string) {
      return emitWithAck('ATTEMPT_START_HANDLE_TASK_BY_ID', { taskId })
    },
    attemptStartHandleTask(taskKeys: string[]) {
      return emitWithAck('ATTEMPT_START_HANDLE_TASK', { taskKeys })
    },
    failHandleTask(taskId, error) {
      return emitWithAck('FAIL_HANDLE_TASK', { taskId, error })
    },
  }
}

interface AppAPIResponse<T> {
  result: T
  error?: { code: string; message: string }
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
  saveLogEntry: (entry: AppLogEntry) => Promise<boolean>
  attemptStartHandleTaskById: (
    taskId: string,
  ) => Promise<AppAPIResponse<AppTask>>
  attemptStartHandleTask: (
    taskKeys: string[],
  ) => Promise<AppAPIResponse<AppTask>>
  failHandleTask: (
    taskId: string,
    error: { code: string; message: string },
  ) => Promise<void>
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

export interface AppTask {
  id: string
  taskKey: string
  inputData: any
  subjectFolderId?: string
  subjectObjectKey?: string
}

export class AppAPIError extends Error {
  errorCode: string
  constructor(errorCode: string, errorMessage: string = '') {
    super()
    this.errorCode = errorCode
    this.message = errorMessage
  }
}
