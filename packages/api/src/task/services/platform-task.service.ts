import {
  FolderPushMessage,
  PLATFORM_IDENTIFIER,
  SystemLogEntry,
} from '@lombokapp/types'
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { and, count, eq, isNull, sql } from 'drizzle-orm'
import { AppService } from 'src/app/services/app.service'
import { OrmService } from 'src/orm/orm.service'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import { PlatformTaskName } from 'src/task/task.constants'

import { BaseProcessor, TaskProcessorError } from '../base.processor'
import { tasksTable } from '../entities/task.entity'
import { TaskService } from './task.service'

const MAX_CONCURRENT_PLATFORM_TASKS = 10
@Injectable()
export class PlatformTaskService {
  private readonly logger = new Logger(PlatformTaskService.name)
  processors: Record<string, BaseProcessor<PlatformTaskName>> = {}
  runningTasksCount = 0
  draining: Promise<{ completed: number; pending: number }> | undefined

  get folderSocketService(): FolderSocketService {
    return this._folderSocketService as FolderSocketService
  }
  get appService(): AppService {
    return this._appService as AppService
  }
  constructor(
    @Inject(forwardRef(() => AppService))
    private readonly _appService,
    private readonly taskService: TaskService,
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => FolderSocketService))
    private readonly _folderSocketService,
  ) {}

  async drainPlatformTasks(waitForCompletion = false) {
    const runId = crypto.randomUUID()
    if (this.draining) {
      this.logger.debug('Platform task draining already running')
      if (waitForCompletion) {
        await this.draining
      }
      return
    }
    this.logger.debug('Draining platform tasks started:', runId)
    let unstartedPlatformTasksCount = 0

    try {
      this.draining = this._drainPlatformTasks()
      const { completed, pending } = await this.draining
      this.logger.debug('Draining platform task run complete:', {
        runId,
        completed,
        pending,
      })
      unstartedPlatformTasksCount = pending
    } catch (error: unknown) {
      this.logger.error('Error draining platform tasks', { error })
    } finally {
      this.draining = undefined
      if (unstartedPlatformTasksCount > 0) {
        await this.drainPlatformTasks()
      }
    }
  }

  private async _drainPlatformTasks() {
    const taskExecutionLimit = Math.max(
      MAX_CONCURRENT_PLATFORM_TASKS - this.runningTasksCount,
      0,
    )
    let completed = 0
    if (taskExecutionLimit) {
      const platformTasksToExecute = await this.ormService.db
        .select({ taskId: tasksTable.id })
        .from(tasksTable)
        .where(
          and(
            isNull(tasksTable.startedAt),
            eq(tasksTable.ownerIdentifier, PLATFORM_IDENTIFIER),
          ),
        )
        .limit(taskExecutionLimit)
      for (const { taskId } of platformTasksToExecute) {
        await this.executePlatformTask(taskId)
        completed++
      }
    }
    return {
      completed,
      pending: await this.unstartedPlatformTaskCount(),
    }
  }

  async unstartedPlatformTaskCount() {
    const [unstartedPlatformTaskCountResult] = await this.ormService.db
      .select({
        count: count(),
      })
      .from(tasksTable)
      .where(
        and(
          isNull(tasksTable.startedAt),
          eq(tasksTable.ownerIdentifier, PLATFORM_IDENTIFIER),
        ),
      )
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return unstartedPlatformTaskCountResult!.count
  }

  async executePlatformTask(taskId: string) {
    const task = await this.ormService.db.query.tasksTable.findFirst({
      where: eq(tasksTable.id, taskId),
    })
    if (!task) {
      throw new Error(`Task not found by ID "${taskId}".`)
    }
    if (task.startedAt) {
      this.logger.warn(
        'Platform task already started during drain (should not happen)',
      )
    } else if (task.ownerIdentifier !== PLATFORM_IDENTIFIER) {
      this.logger.warn(
        'Platform task execution run for non-plaform task (should not happen)',
      )
    } else {
      const startedTimestamp = new Date()
      const startedTask = await this.ormService.db.transaction(async (tx) => {
        const updatedTaskResult = await tx
          .update(tasksTable)
          .set({ startedAt: startedTimestamp, updatedAt: startedTimestamp })
          .where(eq(tasksTable.id, taskId))
          .returning()

        const platformTaskStartLog: SystemLogEntry = {
          at: startedTimestamp,
          payload: {
            logType: 'started',
          },
        }

        await tx
          .update(tasksTable)
          .set({
            systemLog: sql<
              SystemLogEntry[]
            >`coalesce(${tasksTable.systemLog}, '[]'::jsonb) || ${JSON.stringify([platformTaskStartLog])}::jsonb`,
          })
          .where(eq(tasksTable.id, taskId))

        return updatedTaskResult[0]
      })

      if (!startedTask) {
        throw new Error(
          `Task by ID "${taskId}" not found when attempting to start.`,
        )
      }

      if (startedTask.targetLocation?.folderId) {
        // notify folder rooms of updated task
        this.folderSocketService.sendToFolderRoom(
          startedTask.targetLocation.folderId,
          FolderPushMessage.TASK_UPDATED,
          { task: startedTask },
        )
      }
      // we have secured the task, so perform execution
      const processorName = startedTask.taskIdentifier

      const processor = this.processors[processorName]
      if (!processor) {
        throw new Error(`Processor not found by name "${processorName}".`)
      }
      const shouldRegisterComplete = processor.shouldRegisterComplete()
      this.runningTasksCount++
      await processor
        ._run(startedTask)
        .then((processorResult) => {
          if (shouldRegisterComplete) {
            return this.taskService.registerTaskCompleted(taskId, {
              success: true,
              result: processorResult?.result,
            })
          }
          return startedTask
        })
        .catch((error: Error | TaskProcessorError) => {
          // handle failure
          const isCaughtError = error instanceof TaskProcessorError

          return this.taskService.registerTaskCompleted(taskId, {
            success: false,
            error: {
              code: isCaughtError ? error.code : error.name,
              message: error.message,
              details: isCaughtError ? error.details : undefined,
            },
          })
        })
        .then((updatedTask) => {
          if (updatedTask.completedAt && !updatedTask.success) {
            this.logger.warn('Platform task error:', { updatedTask })
          }
          // send a folder socket message to the frontend that the task status was updated
          if (startedTask.targetLocation?.folderId) {
            // notify folder rooms of updated task
            this.folderSocketService.sendToFolderRoom(
              startedTask.targetLocation.folderId,
              FolderPushMessage.TASK_UPDATED,
              {
                updatedTask,
              },
            )
          }
        })
        .finally(() => {
          this.runningTasksCount--
        })
    }
  }

  registerProcessor = <K extends PlatformTaskName>(
    taskName: K,
    processorFunction: BaseProcessor<PlatformTaskName>,
  ) => {
    this.processors[taskName] = processorFunction
  }
}
