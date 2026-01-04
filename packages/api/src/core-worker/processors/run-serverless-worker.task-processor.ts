import { CoreWorkerMessagePayloadTypes } from '@lombokapp/core-worker-utils'
import { Injectable, NotFoundException } from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { OrmService } from 'src/orm/orm.service'
import { BaseProcessor, TaskProcessorError } from 'src/task/base.processor'
import { tasksTable } from 'src/task/entities/task.entity'
import { TaskService } from 'src/task/services/task.service'
import { PlatformTaskName } from 'src/task/task.constants'
import { transformTaskToDTO } from 'src/task/transforms/task.transforms'

import { CoreWorkerService } from '../core-worker.service'

@Injectable()
export class RunServerlessWorkerProcessor extends BaseProcessor<PlatformTaskName.RunServerlessWorker> {
  constructor(
    private readonly ormService: OrmService,
    private readonly serverlessWorkerRunnerService: CoreWorkerService,
    private readonly taskService: TaskService,
  ) {
    super(PlatformTaskName.RunServerlessWorker, async (task) => {
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

      if (!this.serverlessWorkerRunnerService.isReady()) {
        throw new TaskProcessorError(
          'CORE_WORKER_UNAVAILABLE',
          'Core worker not available',
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

      let execResult: CoreWorkerMessagePayloadTypes['execute_task']['response']
      try {
        execResult =
          await this.serverlessWorkerRunnerService.executeServerlessTask({
            task: transformTaskToDTO(startedTask),
            appIdentifier: eventData.appIdentifier,
            workerIdentifier: eventData.workerIdentifier,
          })
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error)
        await this.taskService.registerTaskCompleted(task.id, {
          success: false,
          error: {
            code: 'WORKER_DISPATCH_FAILED',
            message,
          },
        })
        await this.taskService.registerTaskCompleted(innerTask.id, {
          success: false,
          error: {
            code: 'WORKER_DISPATCH_FAILED',
            message,
          },
        })
        throw new TaskProcessorError('WORKER_DISPATCH_FAILED', message)
      }

      if (!execResult.success) {
        await this.taskService.registerTaskCompleted(innerTask.id, {
          success: false,
          error: {
            code: execResult.error.code,
            message: execResult.error.message,
            details: execResult.error.details,
          },
        })
      }

      await this.taskService.registerTaskCompleted(innerTask.id, {
        success: true,
      })
    })
  }
}
