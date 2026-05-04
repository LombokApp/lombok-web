import { TaskCompletion } from '@lombokapp/types'
import { AsyncWorkError, buildUnexpectedError } from '@lombokapp/worker-utils'
import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import { BaseCoreTaskProcessor } from 'src/task/base.processor'
import { tasksTable } from 'src/task/entities/task.entity'
import { TaskService } from 'src/task/services/task.service'
import { CoreTaskName } from 'src/task/task.constants'
import { transformTaskToDTO } from 'src/task/transforms/task.transforms'
import { buildTaskCompletions } from 'src/task/util/build-task-completions.util'

import { CoreWorkerService } from '../core-worker.service'

@Injectable()
export class RunServerlessWorkerTaskProcessor extends BaseCoreTaskProcessor<CoreTaskName.RunServerlessWorker> {
  constructor(
    private readonly ormService: OrmService,
    private readonly coreWorkerService: CoreWorkerService,
    private readonly taskService: TaskService,
  ) {
    super(CoreTaskName.RunServerlessWorker, async (task) => {
      if (task.invocation.kind !== 'event') {
        throw new NotFoundException(
          'RunServerlessWorkerProcessor requires event trigger',
        )
      }

      const innerTask = await this.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, task.data.innerTaskId),
      })

      if (!innerTask) {
        throw new NotFoundException(
          `Inner task not found: ${task.data.innerTaskId} for docker job task ${task.id}`,
        )
      }

      const runtimeExecutorMetadata = {
        type: 'runtime' as const,
        metadata: {
          workerIdentifier: task.data.workerIdentifier,
        },
      }

      const { task: startedTask } = await this.taskService.registerTaskStarted({
        taskId: innerTask.id,
        executorMetadata: runtimeExecutorMetadata,
      })

      let innerTaskCompletion: TaskCompletion
      let runnerTaskCompletion: TaskCompletion
      try {
        const execResult =
          await this.coreWorkerService.executeServerlessAppTask({
            task: transformTaskToDTO(startedTask),
            appIdentifier: task.data.appIdentifier,
            workerIdentifier: task.data.workerIdentifier,
          })
        if (!execResult.success) {
          throw new AsyncWorkError(execResult.error)
        }
        innerTaskCompletion = {
          success: true,
          result: {},
          executorMetadata: runtimeExecutorMetadata,
        }
        runnerTaskCompletion = {
          success: true,
          executorMetadata: { type: 'system', metadata: {} },
          result: {},
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

        const built = buildTaskCompletions({
          normalizedError,
          innerExecutorMetadata: runtimeExecutorMetadata,
          runnerExecutorMetadata: { type: 'system', metadata: {} },
        })
        innerTaskCompletion = built.innerTaskCompletion
        runnerTaskCompletion = built.runnerTaskCompletion
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
