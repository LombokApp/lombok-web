import type { IAppPlatformService } from '@lombokapp/app-worker-sdk'
import { AppAPIError } from '@lombokapp/app-worker-sdk'
import type { CoreWorkerProcessDataPayload } from '@lombokapp/core-worker-utils'
import {
  uniqueExecutionKey,
  WorkerScriptRuntimeError,
} from '@lombokapp/core-worker-utils'
import type { taskSchema } from '@lombokapp/types'
import { z } from 'zod'

import { runWorkerScript } from '../../worker-scripts/run-worker-script'

const runWorkerScriptTaskInputDataSchema = z.object({
  taskId: z.string(),
  appIdentifier: z.string(),
  workerIdentifier: z.string(),
})

export const bulidRunWorkerScriptTaskHandler =
  (workerExecutionOptions: CoreWorkerProcessDataPayload['executionOptions']) =>
  async (
    runWorkerScriptTask: z.infer<typeof taskSchema>,
    server: IAppPlatformService,
  ) => {
    const {
      data: parsedRunWorkerTaskData,
      error: parseRunWorkerTaskDataError,
      success: parseRunWorkerTaskDataSuccess,
    } = runWorkerScriptTaskInputDataSchema.safeParse(runWorkerScriptTask.data)
    if (!parseRunWorkerTaskDataSuccess) {
      throw new AppAPIError(
        'INVALID_TASK',
        'Invalid RunWorkerScript task data',
        parseRunWorkerTaskDataError.flatten().fieldErrors,
      )
    }

    const attemptStartHandleResponse = await server.attemptStartHandleTaskById({
      taskId: runWorkerScriptTask.id,
    })
    if ('error' in attemptStartHandleResponse) {
      throw new AppAPIError(
        attemptStartHandleResponse.error.code,
        attemptStartHandleResponse.error.message,
      )
    }

    const { task } = attemptStartHandleResponse.result
    const appIdentifier = parsedRunWorkerTaskData.appIdentifier
    const workerIdentifier = parsedRunWorkerTaskData.workerIdentifier
    const workerExecutionId = `${workerIdentifier.toLowerCase()}__task__${uniqueExecutionKey()}`
    try {
      await runWorkerScript({
        requestOrTask: task,
        server,
        appIdentifier,
        workerIdentifier,
        workerExecutionId,
        options: workerExecutionOptions,
      })

      // Report success
      await server.completeHandleTask({ taskId: task.id })
    } catch (error) {
      const isWorkerError = error instanceof WorkerScriptRuntimeError
      // Report failure
      if (isWorkerError) {
        // If it's a worker script error, report it as a failure against the worker script task
        await server.failHandleTask({
          taskId: task.id,
          error: {
            code: 'WORKER_SCRIPT_RUNTIME_ERROR',
            message: 'Worker task script failed to load and/or execute.',
            details: error.details,
          },
        })
      } else {
        // If it's not a worker error, report it as an internal server error for the script task and then rethrow so it fails the run_worker_script task
        await server.failHandleTask({
          taskId: task.id,
          error: {
            code: 'WORKER_EXECUTOR_ERROR',
            message:
              'A system error occurred while executing the worker task script.',
          },
        })

        throw error
      }
    }
  }
