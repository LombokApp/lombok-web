import type {
  ExecutorMetadata,
  ExecutorStartMetadata,
  TaskCompletion,
} from '@lombokapp/types'
import type { AsyncWorkError } from '@lombokapp/worker-utils'

/**
 * Build the (innerTaskCompletion, runnerTaskCompletion) pair for a runner
 * processor catch block. The runner task succeeds when the cause chain
 * contains an `origin: 'app'` error (the runner did its job and faithfully
 * reported an app-level failure); it fails when the cause is purely
 * `origin: 'platform'` (provisioning, dispatch, polling, etc.).
 */
export const buildTaskCompletions = ({
  normalizedError,
  innerExecutorMetadata,
  runnerExecutorMetadata,
}: {
  normalizedError: AsyncWorkError
  innerExecutorMetadata: ExecutorMetadata | ExecutorStartMetadata
  runnerExecutorMetadata: ExecutorMetadata | ExecutorStartMetadata
}): {
  innerTaskCompletion: TaskCompletion
  runnerTaskCompletion: TaskCompletion
} => {
  const highestLevelAppError = normalizedError.resolveHighestLevelAppError()
  const runnerSuccess = !!highestLevelAppError

  // Inner-task error policy:
  //  - app-origin failure: surface the app error verbatim (code/name/message/
  //    stack/details) so the app developer sees their own error
  //  - internal-origin failure: keep the inner error generic so we don't
  //    leak platform internals to the app. The full envelope is recorded on
  //    the runner task instead, where admins can inspect it.
  const innerErrorBase = highestLevelAppError
    ? {
        code: highestLevelAppError.code,
        name: highestLevelAppError.name,
        message: highestLevelAppError.message,
        stack: highestLevelAppError.stack,
        details: highestLevelAppError.toEnvelope(),
      }
    : {
        code: 'EXECUTION_ERROR',
        name: 'ExecutionError',
        message:
          'There was an error executing the task (see admin logs for details)',
      }

  const innerTaskCompletion: TaskCompletion = {
    success: false,
    ...(typeof highestLevelAppError?.requeueDelayMs !== 'undefined'
      ? { requeueDelayMs: highestLevelAppError.requeueDelayMs }
      : {}),
    executorMetadata: innerExecutorMetadata,
    error: innerErrorBase,
  }

  const runnerTaskCompletion: TaskCompletion = runnerSuccess
    ? // The runner-success path is only reached when the cause chain contains
      // an origin:'app' error, which means the executor actually ran and
      // populated full ExecutorMetadata (start-only metadata implies the
      // executor never produced an app error).
      ({
        success: true,
        result: {},
        executorMetadata: runnerExecutorMetadata as ExecutorMetadata,
      } satisfies TaskCompletion)
    : {
        success: false,
        executorMetadata: runnerExecutorMetadata,
        error: {
          code: normalizedError.code,
          name: normalizedError.name,
          message: normalizedError.message,
          details: normalizedError.toEnvelope(),
        },
      }

  return { innerTaskCompletion, runnerTaskCompletion }
}
