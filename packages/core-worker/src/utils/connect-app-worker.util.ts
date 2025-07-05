import {
  AppAPIError,
  AppTask,
  buildAppClient,
  CoreServerMessageInterface,
} from '@stellariscloud/app-worker-sdk/src/app-worker-sdk'
import type { AppLogEntry } from '@stellariscloud/types'
import { io } from 'socket.io-client'

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
  const taskKeys = Object.keys(taskHandlers)
  // log({ message: 'Connecting...', data: { connectURL, taskKeys } })
  const socket = io(`${socketBaseUrl}/apps`, {
    auth: {
      appWorkerId,
      token: appToken,
      handledTaskKeys: taskKeys,
    },
    reconnection: false,
  })
  const serverClient = buildAppClient(socket, socketBaseUrl)
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
