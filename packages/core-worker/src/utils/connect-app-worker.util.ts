import type {
  ContentAttributesType,
  ContentMetadataType,
  AppLogEntry,
} from '@stellariscloud/types'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

const SOCKET_RESPONSE_TIMEOUT = 2000

export const buildAppClient = (socket: Socket): CoreServerMessageInterface => {
  return {
    saveLogEntry(entry) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('APP_API', {
        name: 'SAVE_LOG_ENTRY',
        data: entry,
      })
    },
    getContentSignedUrls(requests) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('APP_API', {
        name: 'GET_CONTENT_SIGNED_URLS',
        data: { requests },
      })
    },
    getMetadataSignedUrls(requests) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('APP_API', {
        name: 'GET_METADATA_SIGNED_URLS',
        data: {
          requests,
        },
      })
    },
    updateContentAttributes(updates) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('APP_API', {
        name: 'UPDATE_CONTENT_ATTRIBUTES',
        data: {
          updates,
        },
      })
    },
    updateContentMetadata(updates, taskId) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('APP_API', {
        name: 'UPDATE_CONTENT_METADATA',
        data: {
          taskId,
          updates,
        },
      })
    },
    completeHandleTask(taskId) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('APP_API', {
        name: 'COMPLETE_HANDLE_TASK',
        data: taskId,
      })
    },
    attemptStartHandleTask(taskKeys: string[]) {
      return socket.timeout(SOCKET_RESPONSE_TIMEOUT).emitWithAck('APP_API', {
        name: 'ATTEMPT_START_HANDLE_TASK',
        data: { taskKeys },
      })
    },
    failHandleTask(taskId, error) {
      return socket.emitWithAck('APP_API', {
        name: 'FAIL_HANDLE_TASK',
        data: { taskId, error },
      })
    },
  }
}

interface AppAPIResponse<T> {
  result: T
  error?: { code: string; message: string }
}
export interface CoreServerMessageInterface {
  saveLogEntry: (entry: AppLogEntry) => Promise<boolean>
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
  updateContentAttributes: (
    updates: {
      folderId: string
      objectKey: string
      hash: string
      attributes: ContentAttributesType
    }[],
    eventId?: string,
  ) => Promise<AppAPIResponse<void>>
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
  data: any
}

export class AppAPIError extends Error {
  errorCode: string
  constructor(errorCode: string, errorMessage: string = '') {
    super()
    this.errorCode = errorCode
    this.message = errorMessage
  }
}

export const connectAndPerformWork = (
  socketBaseUrl: string,
  appWorkerId: string,
  appToken: string,
  taskHandlers: {
    [taskKey: string]: (
      task: AppTask,
      serverClient: CoreServerMessageInterface,
    ) => Promise<void>
  },
  _log: (entry: Partial<AppLogEntry>) => void,
) => {
  // TODO: send internal state back to the core via a message
  const taskKeys = Object.keys(taskHandlers)
  const socket = io(`${socketBaseUrl}/apps`, {
    auth: {
      appWorkerId,
      token: appToken,
      handledTaskKeys: taskKeys,
    },
    reconnection: false,
  })
  let concurrentTasks = 0

  const serverClient = buildAppClient(socket)

  const shutdown = () => {
    socket.disconnect()
  }

  const wait = new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      console.log('App Worker "%s" connected.', appWorkerId)
    })
    socket.on('disconnect', (reason) => {
      console.log('Worker disconnected. Reason:', reason)
      _log({
        message: 'Core app worker websocket disconnected.',
        name: 'CoreAppWorkerDisconnect',
        data: {
          appWorkerId,
        },
      })
      resolve()
    })
    socket.onAny((_data) => {
      console.log('Got event in worker thread:', _data)
    })

    socket.on('PENDING_TASKS_NOTIFICATION', async (_data) => {
      console.log('Worker for PENDING_TASKS_NOTIFICATION!', _data)
      if (concurrentTasks < 10) {
        try {
          concurrentTasks++
          const attemptStartHandleResponse =
            await serverClient.attemptStartHandleTask(taskKeys)
          const task = attemptStartHandleResponse.result
          if (attemptStartHandleResponse.error) {
            const errorMessage = `${attemptStartHandleResponse.error.code} - ${attemptStartHandleResponse.error.message}`
            _log({ message: errorMessage, name: 'Error' })
          } else {
            await taskHandlers[task.taskKey](task, serverClient)
              .then(() => serverClient.completeHandleTask(task.id))
              .catch((e) => {
                console.log('APP_WORKER_EXECUTION_ERROR:', {
                  name: e.name,
                  message: e.message,
                  stack: e.stack,
                })
                return serverClient.failHandleTask(task.id, {
                  code:
                    e instanceof AppAPIError
                      ? e.errorCode
                      : 'APP_WORKER_EXECUTION_ERROR',
                  message: `${e.name}: ${e.message}`,
                })
              })
          }
        } catch (error: any) {
          console.log('Unexpected error during app worker execution', {
            name: error?.name ?? '',
            message: error?.message ?? '',
            stack: error?.stack ?? '',
          })
        } finally {
          concurrentTasks--
        }
      }
    })

    socket.on('error', (error) => {
      console.log('Socket error:', error, appWorkerId)
      _log({
        message: 'Core app worker websocket disconnected.',
        name: 'CoreAppWorkerSocketError',
        level: 'error',
        data: {
          appWorkerId,
          name: error.name,
          stacktrace: error.stacktrace,
          message: error.message,
        },
      })
      socket.close()
      reject(error)
    })
  })

  return {
    shutdown,
    wait,
  }
}
