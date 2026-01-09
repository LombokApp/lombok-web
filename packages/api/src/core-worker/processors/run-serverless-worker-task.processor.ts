import {
  AsyncWorkError,
  buildUnexpectedError,
} from '@lombokapp/core-worker-utils'
import { TaskCompletion } from '@lombokapp/types'
import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import { BaseCoreTaskProcessor } from 'src/task/base.processor'
import { tasksTable } from 'src/task/entities/task.entity'
import { TaskService } from 'src/task/services/task.service'
import { CoreTaskName } from 'src/task/task.constants'
import { transformTaskToDTO } from 'src/task/transforms/task.transforms'

import { CoreWorkerService } from '../core-worker.service'

@Injectable()
export class RunServerlessWorkerTaskProcessor extends BaseCoreTaskProcessor<CoreTaskName.RunServerlessWorker> {
  constructor(
    private readonly ormService: OrmService,
    private readonly coreWorkerService: CoreWorkerService,
    private readonly taskService: TaskService,
  ) {
    super(CoreTaskName.RunServerlessWorker, async (task) => {
      if (task.trigger.kind !== 'event') {
        throw new NotFoundException(
          'RunServerlessWorkerProcessor requires event trigger',
        )
      }

      const invokeContext = task.trigger.invokeContext
      const eventData = invokeContext.eventData as {
        innerTaskId: string
        appIdentifier: string
        workerIdentifier: string
      }

      if (!eventData.appIdentifier || !eventData.workerIdentifier) {
        throw new NotFoundException(
          'RunServerlessWorkerProcessor requires app and worker identifiers',
        )
      }

      const innerTask = await this.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, eventData.innerTaskId),
      })

      if (!innerTask) {
        throw new NotFoundException(
          `Inner task not found: ${eventData.innerTaskId} for docker job task ${task.id}`,
        )
      }

      const { task: startedTask } = await this.taskService.registerTaskStarted({
        taskId: innerTask.id,
        startContext: {
          __executor: {
            kind: 'core_worker',
          },
        },
      })

      let innerTaskCompletion: TaskCompletion
      let runnerTaskCompletion: TaskCompletion
      try {
        const execResult =
          await this.coreWorkerService.executeServerlessAppTask({
            task: transformTaskToDTO(startedTask),
            appIdentifier: eventData.appIdentifier,
            workerIdentifier: eventData.workerIdentifier,
          })
        if (!execResult.success) {
          throw new AsyncWorkError(execResult.error)
        }
        innerTaskCompletion = {
          success: true,
        }
        runnerTaskCompletion = {
          success: true,
          // result: ... // TODO: add execution details as the result of the runner task
        }
      } catch (error) {
        const normalizedError =
          error instanceof AsyncWorkError
            ? error
            : buildUnexpectedError({
                code: 'UNEXPECTED_SERVERLESS_EXECUTION_ERROR',
                message:
                  'Unexpected error during in run serverless worker core task processor (run-serverless-worker-task.processor.ts)',
                error,
              })

        const resolveHighestLevelAppError = (
          _error: AsyncWorkError,
        ): AsyncWorkError | undefined => {
          if (_error.origin === 'app') {
            return _error
          }
          if (_error.cause) {
            return resolveHighestLevelAppError(_error.cause)
          }
        }

        const highestLevelAppError =
          resolveHighestLevelAppError(normalizedError)
        const runnerSuccess = !!highestLevelAppError
        const appRequestedRequeue = highestLevelAppError?.requeue
        innerTaskCompletion = {
          success: false,
          ...(appRequestedRequeue?.mode === 'auto' &&
          'delayMs' in appRequestedRequeue
            ? { requeue: { delayMs: appRequestedRequeue.delayMs } }
            : {}),
          error: {
            code: highestLevelAppError?.code ?? 'EXECUTION_ERROR',
            name: highestLevelAppError?.name ?? 'ExecutionError',
            message:
              highestLevelAppError?.message ??
              `There was an error executing the task (${appRequestedRequeue ? 'requeued' : 'see admin logs for details'})`,
            ...(highestLevelAppError
              ? {
                  name: highestLevelAppError.name,
                  message: highestLevelAppError.message,
                  stack: highestLevelAppError.stack,
                  details: highestLevelAppError.toEnvelope(),
                }
              : {}), // TODO: add some details for an internal (non-app) error
          },
        }

        runnerTaskCompletion = {
          success: runnerSuccess,
          ...(!runnerSuccess
            ? {
                error: {
                  code: normalizedError.code,
                  name: normalizedError.name,
                  message: normalizedError.message,
                  details: normalizedError.toEnvelope(),
                },
              }
            : undefined),
        } as TaskCompletion
      }

      // Update the inner and runner tasks in a transaction
      await this.ormService.db.transaction(async (tx) => {
        await this.taskService.registerTaskCompleted(
          innerTask.id,
          innerTaskCompletion,
          { tx },
        )

        await this.taskService.registerTaskCompleted(
          task.id,
          runnerTaskCompletion,
          { tx },
        )
      })
    })
  }

  override shouldRegisterComplete() {
    return false
  }
}
