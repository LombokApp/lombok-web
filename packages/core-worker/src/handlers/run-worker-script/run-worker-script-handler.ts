import type { AppTask, IAppPlatformService } from '@lombokapp/app-worker-sdk'
import { AppAPIError } from '@lombokapp/app-worker-sdk'
import { safeZodParse } from '@lombokapp/utils'
import { z } from 'zod'

import { WorkerScriptRuntimeError } from '../../errors'
import { uniqueExecutionKey } from '../../utils/ids'
import { runWorkerScript } from '../../worker-scripts/run-worker-script'
import type { CoreWorkerProcessDataPayload } from '../../worker-scripts/types'

const runWorkerScriptTaskInputDataSchema = z.object({
  taskId: z.string(),
  appIdentifier: z.string(),
  workerIdentifier: z.string(),
})

export const bulidRunWorkerScriptTaskHandler =
  (workerExecutionOptions: CoreWorkerProcessDataPayload['executionOptions']) =>
  async (runWorkerScriptTask: AppTask, server: IAppPlatformService) => {
    if (
      !safeZodParse(
        runWorkerScriptTask.event.data,
        runWorkerScriptTaskInputDataSchema,
      )
    ) {
      throw new AppAPIError('INVALID_TASK', 'Missing task id.')
    }

    const attemptStartHandleResponse = await server.attemptStartHandleTaskById(
      runWorkerScriptTask.event.data.taskId,
    )
    if (attemptStartHandleResponse.error) {
      throw new AppAPIError(
        attemptStartHandleResponse.error.code,
        attemptStartHandleResponse.error.message,
      )
    }
    const workerScriptTask = attemptStartHandleResponse.result
    const appIdentifier = runWorkerScriptTask.event.data.appIdentifier
    const workerIdentifier = runWorkerScriptTask.event.data.workerIdentifier
    const workerExecutionId = `${workerIdentifier.toLowerCase()}__task__${uniqueExecutionKey()}`
    try {
      await runWorkerScript({
        requestOrTask: workerScriptTask,
        server,
        appIdentifier,
        workerIdentifier,
        workerExecutionId,
        options: workerExecutionOptions,
      })

      // Report success
      await server.completeHandleTask(workerScriptTask.id)
    } catch (error) {
      const isWorkerError = error instanceof WorkerScriptRuntimeError
      // Report failure
      if (isWorkerError) {
        // If it's a worker script error, report it as a failure against the worker script task
        await server.failHandleTask(workerScriptTask.id, {
          code: 'WORKER_SCRIPT_RUNTIME_ERROR',
          message: 'Worker task script failed to load and/or execute.',
          details: error.details,
        })
      } else {
        // If it's not a worker error, report it as an internal server error for the script task and then rethrow so it fails the run_worker_script task
        await server.failHandleTask(workerScriptTask.id, {
          code: 'WORKER_EXECUTOR_ERROR',
          message:
            'A system error occurred while executing the worker task script.',
        })

        throw error
      }
    }
  }
