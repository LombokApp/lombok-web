import type {
  AppTask,
  CoreServerMessageInterface,
} from '@stellariscloud/app-worker-sdk/src/app-worker-sdk'
import {
  AppAPIError,
  buildAppClient,
} from '@stellariscloud/app-worker-sdk/src/app-worker-sdk'
import type { AppLogEntry } from '@stellariscloud/types'
import { serializeError } from '@stellariscloud/utils'
import { io } from 'socket.io-client'

import type { SerializeableError } from '../errors/errors'
import { serializeWorkerError } from '../errors/errors'

export const connectAndPerformWork = async (
  socketBaseUrl: string,
  appWorkerId: string,
  appToken: string,
  taskHandlers: Record<
    string,
    (task: AppTask, serverClient: CoreServerMessageInterface) => Promise<void>
  >,
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
      name: logEntryProperties.name ?? 'info',
      level: logEntryProperties.level ?? 'info',
      message: logEntryProperties.message ?? '',
    }
    await serverClient.saveLogEntry(logEntry)
  }
  await log({ message: 'Connected.' })
  let concurrentTasks = 0

  const shutdown = () => {
    socket.disconnect()
  }

  const wait = new Promise<void>((resolve, reject) => {
    socket.on('connect', async () => {
      await log({ message: `App Worker "${appWorkerId}" connected.` })
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
      // eslint-disable-next-line no-console
      ;(socket.disconnected ? console.log : log)({
        message: 'Got event in worker thread',
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
            await log({ message: errorMessage, name: 'Error' })
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
                })
              })
          }
        } catch (error: unknown) {
          ;(socket.disconnected ? console.log : log)({
            level: 'error',
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
      ;(socket.disconnected ? console.log : log)({
        message: 'Core app worker websocket error.',
        name: 'CoreAppWorkerSocketError',
        level: 'error',
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
