import type { IAppPlatformService } from '@lombokapp/app-worker-sdk'
import { AppAPIError, buildAppClient } from '@lombokapp/app-worker-sdk'
import { serializeWorkerError } from '@lombokapp/core-worker-utils'
import {
  type AppLogEntry,
  type JsonSerializableObject,
  LogEntryLevel,
  type TaskDTO,
} from '@lombokapp/types'
import { serializeError } from '@lombokapp/utils'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

interface ConnectAndPerformWorkResult {
  shutdown: () => void
  wait: Promise<void>
  socket: Socket
  log: (logEntryProperties: Partial<AppLogEntry>) => Promise<void>
}

export const connectAndPerformWork = (
  socketBaseUrl: string,
  instanceId: string,
  appToken: string,
  taskHandlers: Record<
    string,
    (task: TaskDTO, serverClient: IAppPlatformService) => Promise<void>
  >,
  onConnect: () => Promise<void>,
): ConnectAndPerformWorkResult => {
  // TODO: send internal state back to the core via a message
  const taskIdentifiers = Object.keys(taskHandlers)
  // log({ message: 'Connecting...', data: { connectURL, taskIdentifiers } })
  const socket = io(`${socketBaseUrl}/apps`, {
    auth: {
      instanceId,
      token: appToken,
      handledTaskIdentifiers: taskIdentifiers,
    },
    reconnection: false,
  })
  const serverClient = buildAppClient(socket, socketBaseUrl)
  const log = async (logEntryProperties: Partial<AppLogEntry>) => {
    const logEntry: AppLogEntry = {
      data: logEntryProperties.data ?? {},
      level: logEntryProperties.level ?? LogEntryLevel.INFO,
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
        level: LogEntryLevel.DEBUG,
        message: `Worker disconnected - Reason: ${reason}`,
        data: {
          instanceId,
        },
      })
      resolve()
    })

    socket.onAny((_data) => {
      // eslint-disable-next-line no-console
      void ((socket.disconnected ? console.log : log) as typeof log)({
        message: 'Got event in worker thread',
        level: LogEntryLevel.DEBUG,
        data: {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          event: _data,
        },
      })
    })

    socket.on('PENDING_TASKS_NOTIFICATION', async (_data) => {
      if (concurrentTasks < 10) {
        try {
          concurrentTasks++
          const attemptStartHandleResponse =
            await serverClient.attemptStartHandleAnyAvailableTask({
              taskIdentifiers,
            })

          if ('error' in attemptStartHandleResponse) {
            const errorMessage = `${attemptStartHandleResponse.error.code} - ${attemptStartHandleResponse.error.message}`
            await log({
              message: `Error attempting to start handle task: ${errorMessage}`,
              level: LogEntryLevel.ERROR,
            })
            reject(new Error(errorMessage))
          } else {
            const { task } = attemptStartHandleResponse.result
            const taskHandler = taskHandlers[task.taskIdentifier]
            if (!taskHandler) {
              await log({
                message: `Unknown task identifier: ${task.taskIdentifier}`,
                level: LogEntryLevel.ERROR,
              })
              reject(
                new Error(`Unknown task identifier: ${task.taskIdentifier}`),
              )
              return
            }
            await taskHandler(task as TaskDTO, serverClient)
              .then(() =>
                serverClient.completeHandleTask({
                  success: true,
                  taskId: task.id,
                }),
              )
              .catch((e: unknown) => {
                return serverClient.completeHandleTask({
                  success: false,
                  taskId: task.id,
                  error: {
                    code: String(
                      e instanceof AppAPIError
                        ? e.errorCode
                        : 'APP_TASK_EXECUTION_ERROR',
                    ),
                    message: serializeError(e),
                    details: JSON.parse(
                      serializeWorkerError(e),
                    ) as JsonSerializableObject,
                  },
                })
              })
          }
        } catch (error: unknown) {
          void ((socket.disconnected ? console.log : log) as typeof log)({
            level: LogEntryLevel.ERROR,
            message: 'Unexpected error during app worker execution',
            data: {
              errorObj: JSON.parse(
                serializeWorkerError(error),
              ) as JsonSerializableObject,
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
        level: LogEntryLevel.ERROR,
        data: {
          instanceId,
          errorObj: JSON.parse(
            serializeWorkerError(error),
          ) as JsonSerializableObject,
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
