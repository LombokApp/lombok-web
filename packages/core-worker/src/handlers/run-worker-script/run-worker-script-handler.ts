import {
  AppAPIError,
  AppTask,
  CoreServerMessageInterface,
} from '@stellariscloud/app-worker-sdk'
import { runWorkerScript } from '../../worker-scripts/run-worker-script'

export const runWorkerScriptTaskHandler = async (
  runWorkerScriptTask: AppTask,
  server: CoreServerMessageInterface,
) => {
  if (!runWorkerScriptTask.id) {
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

  try {
    await runWorkerScript({
      requestOrTask: workerScriptTask,
      server,
      appIdentifier,
      workerIdentifier,
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
