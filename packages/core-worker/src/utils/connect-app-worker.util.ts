import type { ContentMetadataType, AppLogEntry } from '@stellariscloud/types'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

const SOCKET_RESPONSE_TIMEOUT = 2000

export const buildAppClient = (socket: Socket): CoreServerMessageInterface => {
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
    getWorkerPayloadSignedUrl(appIdentifier, workerIdentifier) {
      return emitWithAck('GET_WORKER_PAYLOAD_SIGNED_URL', {
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
  getWorkerPayloadSignedUrl: (
    appIdentifier: string,
    workerIdentifier: string,
  ) => Promise<AppAPIResponse<{ url: string }>>
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
) => {
  // TODO: send internal state back to the core via a message
  const connectURL = `${socketBaseUrl}/apps`
  const taskKeys = Object.keys(taskHandlers)
  // log({ message: 'Connecting...', data: { connectURL, taskKeys } })
  const socket = io(connectURL, {
    auth: {
      appWorkerId,
      token: appToken,
      handledTaskKeys: taskKeys,
    },
    reconnection: false,
  })
  const serverClient = buildAppClient(socket)
  const log = (logEntryProperties: Partial<AppLogEntry>) => {
    const logEntry: AppLogEntry = {
      data: logEntryProperties.data ?? {},
      name: logEntryProperties.name ?? 'info',
      level: logEntryProperties.level ?? 'info',
      message: logEntryProperties.message ?? '',
    }
    serverClient.saveLogEntry(logEntry)
  }
  log({ message: 'Connected.' })
  let concurrentTasks = 0

  const shutdown = () => {
    socket.disconnect()
  }

  const wait = new Promise<void>((resolve, reject) => {
    socket.on('connect', () => {
      log({ message: `App Worker "${appWorkerId}" connected.` })
    })

    socket.on('disconnect', (reason) => {
      console.log({
        level: 'warning',
        message: `Worker disconnected. Reason: ${reason}`,
        data: {
          appWorkerId,
        },
      })
      resolve()
    })

    socket.onAny((_data) => {
      ;(socket.disconnected ? console.log : log)({
        message: 'Got event in worker thread',
        data: _data,
      })
    })

    socket.on('PENDING_TASKS_NOTIFICATION', async (_data) => {
      if (concurrentTasks < 10) {
        try {
          concurrentTasks++
          const attemptStartHandleResponse =
            await serverClient.attemptStartHandleTask(taskKeys)
          const task = attemptStartHandleResponse.result
          if (attemptStartHandleResponse.error) {
            const errorMessage = `${attemptStartHandleResponse.error.code} - ${attemptStartHandleResponse.error.message}`
            log({ message: errorMessage, name: 'Error' })
          } else {
            await taskHandlers[task.taskKey](task, serverClient)
              .then(() => serverClient.completeHandleTask(task.id))
              .catch((e) => {
                return serverClient.failHandleTask(task.id, {
                  code: String(
                    e instanceof AppAPIError
                      ? e.errorCode
                      : 'APP_TASK_EXECUTION_ERROR',
                  ),
                  message: `${e.name}: ${e.message}`,
                })
              })
          }
        } catch (error: any) {
          ;(socket.disconnected ? console.log : log)({
            level: 'error',
            message: 'Unexpected error during app worker execution',
            data: {
              name: error?.name ?? '',
              message: error?.message ?? '',
              stack: error?.stack ?? '',
            },
          })
        } finally {
          concurrentTasks--
        }
      }
    })

    socket.on('error', (error) => {
      ;(socket.disconnected ? console.log : log)({
        message: 'Core app worker websocket error.',
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
    socket,
    log,
  }
}
