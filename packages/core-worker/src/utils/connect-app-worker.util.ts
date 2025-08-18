import type {
  AppTask,
  PlatformServerMessageInterface,
} from '@stellariscloud/app-worker-sdk/src/app-worker-sdk'
import {
  AppAPIError,
  buildAppClient,
} from '@stellariscloud/app-worker-sdk/src/app-worker-sdk'
import type { AppLogEntry, WorkerErrorDetails } from '@stellariscloud/types'
import { serializeError } from '@stellariscloud/utils'
import { io } from 'socket.io-client'

import type { SerializeableError } from '../errors/errors'
import { serializeWorkerError } from '../errors/errors'

export const connectAndPerformWork = (
  socketBaseUrl: string,
  appWorkerId: string,
  appToken: string,
  taskHandlers: Record<
    string,
    (
      task: AppTask,
      serverClient: PlatformServerMessageInterface,
    ) => Promise<void>
  >,
  onConnect: () => Promise<void>,
) => {
  // TODO: send internal state back to the core via a message
  const taskIdentifiers = Object.keys(taskHandlers)
  // log({ message: 'Connecting...', data: { connectURL, taskIdentifiers } })
  const socket = io(`${socketBaseUrl}/apps`, {
    auth: {
      appWorkerId,
      token: appToken,
      handledTaskIdentifiers: taskIdentifiers,
    },
    reconnection: false,
  })
  const serverClient = buildAppClient(socket, socketBaseUrl)
  const log = async (logEntryProperties: Partial<AppLogEntry>) => {
    const logEntry: AppLogEntry = {
      data: logEntryProperties.data ?? {},
      level: logEntryProperties.level ?? 'INFO',
      message: logEntryProperties.message ?? '',
    }
    await serverClient.saveLogEntry(logEntry)
  }
  let concurrentTasks = 0

  const shutdown = () => {
    socket.disconnect()
  }

  socket.on('connect', onConnect)
  const wait = new Promise<void>((resolve, reject) => {
    socket.on('disconnect', (reason) => {
      void log({
        level: 'DEBUG',
        message: `Worker disconnected - Reason: ${reason}`,
        data: {
          appWorkerId,
        },
      })
      resolve()
    })

    socket.onAny((_data) => {
      // eslint-disable-next-line no-console
      void ((socket.disconnected ? console.log : log) as typeof log)({
        message: 'Got event in worker thread',
        level: 'DEBUG',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: _data,
      })
    })

    socket.on('PENDING_TASKS_NOTIFICATION', async (_data) => {
      if (concurrentTasks < 10) {
        try {
          concurrentTasks++
          const attemptStartHandleResponse =
            await serverClient.attemptStartHandleTask(taskIdentifiers)
          const task = attemptStartHandleResponse.result
          if (attemptStartHandleResponse.error) {
            const errorMessage = `${attemptStartHandleResponse.error.code} - ${attemptStartHandleResponse.error.message}`
            await log({
              message: `Error attempting to start handle task: ${errorMessage}`,
              level: 'ERROR',
            })
          } else {
            await taskHandlers[task.taskIdentifier](task, serverClient)
              .then(() => serverClient.completeHandleTask(task.id))
              .catch((e: unknown) => {
                return serverClient.failHandleTask(task.id, {
                  code: String(
                    e instanceof AppAPIError
                      ? e.errorCode
                      : 'APP_TASK_EXECUTION_ERROR',
                  ),
                  message: serializeError(e),
                  details: JSON.parse(
                    serializeWorkerError(e),
                  ) as WorkerErrorDetails,
                })
              })
          }
        } catch (error: unknown) {
          void ((socket.disconnected ? console.log : log) as typeof log)({
            level: 'ERROR',
            message: 'Unexpected error during app worker execution',
            data: {
              errorObj: JSON.parse(
                serializeWorkerError(error),
              ) as SerializeableError,
              errorStr: serializeError(error),
            },
          })
        } finally {
          concurrentTasks--
        }
      }
    })

    socket.on('error', (error) => {
      void ((socket.disconnected ? console.log : log) as typeof log)({
        message: 'Core app worker websocket error',
        level: 'ERROR',
        data: {
          appWorkerId,
          errorObj: JSON.parse(
            serializeWorkerError(error),
          ) as SerializeableError,
          errorStr: serializeError(error),
        },
      })
      socket.close()
      reject(error instanceof Error ? error : new Error(String(error)))
    })
  })

  return {
    shutdown,
    wait,
    socket,
    log,
  }
}
