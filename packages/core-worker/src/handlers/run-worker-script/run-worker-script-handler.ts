import type {
  AppTask,
  CoreServerMessageInterface,
} from '@stellariscloud/app-worker-sdk'
import { AppAPIError } from '@stellariscloud/app-worker-sdk'
import { safeZodParse } from '@stellariscloud/utils'
import { z } from 'zod'

import { uniqueExecutionKey } from '../../utils/ids'
import { runWorkerScript } from '../../worker-scripts/run-worker-script'

const runWorkerScriptTaskInputDataSchema = z.object({
  taskId: z.string(),
  appIdentifier: z.string(),
  workerIdentifier: z.string(),
})

export const runWorkerScriptTaskHandler = async (
  runWorkerScriptTask: AppTask,
  server: CoreServerMessageInterface,
) => {
  if (
    !safeZodParse(
      runWorkerScriptTask.inputData,
      runWorkerScriptTaskInputDataSchema,
    )
  ) {
    throw new AppAPIError('INVALID_TASK', 'Missing task id.')
  }

  const attemptStartHandleResponse = await server.attemptStartHandleTaskById(
    runWorkerScriptTask.inputData.taskId,
  )
  if (attemptStartHandleResponse.error) {
    throw new AppAPIError(
      attemptStartHandleResponse.error.code,
      attemptStartHandleResponse.error.message,
    )
  }
  const workerScriptTask = attemptStartHandleResponse.result
  const appIdentifier = runWorkerScriptTask.inputData.appIdentifier
  const workerIdentifier = runWorkerScriptTask.inputData.workerIdentifier
  const workerExecutionId = `${workerIdentifier.toLowerCase()}__task__${uniqueExecutionKey()}`

  try {
    await runWorkerScript({
      requestOrTask: workerScriptTask,
      server,
      appIdentifier,
      workerIdentifier,
      workerExecutionId,
    })

    // Report success
    await server.completeHandleTask(workerScriptTask.id)
  } catch (error) {
    // Report failure
    await server.failHandleTask(workerScriptTask.id, {
      code: 'APP_TASK_EXECUTION_ERROR',
      message:
        error instanceof Error
          ? error.message
          : 'Failed to execute worker script',
    })
    throw error
  }
}
