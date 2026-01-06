import {
  CoreWorkerMessagePayloadTypes,
  NotReadyAsyncWorkError,
} from '@lombokapp/core-worker-utils'
import { JsonSerializableObject } from '@lombokapp/types'
import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import {
  BaseCoreTaskProcessor,
  CoreTaskProcessorError,
} from 'src/task/base.processor'
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
      const genericExecutionError = {
        code: 'WORKER_EXECUTION_ERROR',
        message: 'Worker execution failed',
      }
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

      if (!this.coreWorkerService.isReady()) {
        throw new NotReadyAsyncWorkError({
          code: 'SERVERLESS_EXECUTOR_NOT_READY',
          message: 'Serverless executor not ready to accept workloads',
          retry: true,
          stack: new Error().stack,
        })
      }

      const { task: startedTask } = await this.taskService.registerTaskStarted({
        taskId: innerTask.id,
        startContext: {
          __executor: {
            kind: 'core_worker',
          },
        },
      })

      let execResult: CoreWorkerMessagePayloadTypes['execute_task']['response']
      try {
        execResult = await this.coreWorkerService.executeServerlessAppTask({
          task: transformTaskToDTO(startedTask),
          appIdentifier: eventData.appIdentifier,
          workerIdentifier: eventData.workerIdentifier,
        })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        await this.taskService.registerTaskCompleted(innerTask.id, {
          success: false,
          error: genericExecutionError,
        })
        const details: JsonSerializableObject = {
          message,
        }
        // console.log(
        //   'error [%s] (%s): %s',
        //   error instanceof Error ? error.name : 'Unknown',
        //   error instanceof Error ? error.message : 'n/a',
        //   JSON.stringify(error, null, 2),
        // )
        if (error instanceof Error) {
          details.name = error.name
          if (error.stack) {
            details.stack = error.stack
          }
        }
        throw new CoreTaskProcessorError(
          error instanceof Error ? error.name : 'Unknown',
          message,
          details,
        )
      }

      if (!execResult.success) {
        if (execResult.error.code === 'WORKER_SCRIPT_RUNTIME_ERROR') {
          await this.taskService.registerTaskCompleted(innerTask.id, {
            success: false,
            error: {
              code: execResult.error.code,
              message: execResult.error.message,
              details: execResult.error.details,
            },
          })
          return
        }

        await this.taskService.registerTaskCompleted(innerTask.id, {
          success: false,
          error: genericExecutionError,
        })
        throw new CoreTaskProcessorError(
          execResult.error.code,
          execResult.error.message,
          execResult.error.details,
        )
      }

      await this.taskService.registerTaskCompleted(innerTask.id, {
        success: true,
      })
    })
  }
}
