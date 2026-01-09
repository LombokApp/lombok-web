import {
  AsyncWorkError,
  buildUnexpectedError,
} from '@lombokapp/core-worker-utils'
import {
  CORE_IDENTIFIER,
  FolderPushMessage,
  SystemLogEntry,
} from '@lombokapp/types'
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { and, count, eq, isNull, lt, or, sql } from 'drizzle-orm'
import { AppService } from 'src/app/services/app.service'
import { OrmService } from 'src/orm/orm.service'
import { runWithThreadContext } from 'src/shared/thread-context'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import { CoreTaskName, MAX_TASK_ATTEMPTS } from 'src/task/task.constants'

import type { CoreTask } from '../base.processor'
import { BaseCoreTaskProcessor } from '../base.processor'
import { tasksTable } from '../entities/task.entity'
import { TaskService } from './task.service'

const MAX_CONCURRENT_CORE_TASKS = 10

@Injectable()
export class CoreTaskService {
  private readonly logger = new Logger(CoreTaskService.name)
  processors: Partial<
    Record<CoreTaskName, BaseCoreTaskProcessor<CoreTaskName>>
  > = {}
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

  async startDrainCoreTasks() {
    const runId = crypto.randomUUID()
    if (this.draining) {
      this.logger.debug('Core task draining called while already running')
      return
    }
    this.logger.verbose('Draining core tasks started')
    let unstartedCoreTasksCount = 0

    try {
      this.draining = this._drainCoreTasks()
      const { completed, pending } = await this.draining
      this.logger.verbose('Draining core task run complete:', {
        runId,
        completed,
        pending,
      })
      unstartedCoreTasksCount = pending
    } catch (error: unknown) {
      this.logger.error('Error draining core tasks', { error })
    } finally {
      this.draining = undefined
      if (unstartedCoreTasksCount > 0) {
        await this.startDrainCoreTasks()
      }
    }
  }

  private async _drainCoreTasks() {
    const taskExecutionLimit = Math.max(
      MAX_CONCURRENT_CORE_TASKS - this.runningTasksCount,
      0,
    )
    let completed = 0
    if (taskExecutionLimit) {
      const coreTasksToExecute = await this.ormService.db
        .select({ taskId: tasksTable.id })
        .from(tasksTable)
        .where(
          and(
            isNull(tasksTable.startedAt),
            lt(tasksTable.attemptCount, MAX_TASK_ATTEMPTS),
            or(
              isNull(tasksTable.dontStartBefore),
              sql`${tasksTable.dontStartBefore} <= NOW()`,
            ),
            eq(tasksTable.ownerIdentifier, CORE_IDENTIFIER),
          ),
        )
        .limit(taskExecutionLimit)
      for (const { taskId } of coreTasksToExecute) {
        await this.executeCoreTask(taskId)
        completed++
      }
    }
    return {
      completed,
      pending: await this.unstartedCoreTaskCount(),
    }
  }

  async unstartedCoreTaskCount() {
    const [unstartedCoreTaskCountResult] = await this.ormService.db
      .select({
        count: count(),
      })
      .from(tasksTable)
      .where(
        and(
          isNull(tasksTable.startedAt),
          lt(tasksTable.attemptCount, MAX_TASK_ATTEMPTS),
          or(
            isNull(tasksTable.dontStartBefore),
            sql`${tasksTable.dontStartBefore} <= NOW()`,
          ),
          eq(tasksTable.ownerIdentifier, CORE_IDENTIFIER),
        ),
      )
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return unstartedCoreTaskCountResult!.count
  }

  async executeCoreTask(taskId: string) {
    const task = await this.ormService.db.query.tasksTable.findFirst({
      where: eq(tasksTable.id, taskId),
    })
    if (!task) {
      throw new Error(`Task not found by ID "${taskId}".`)
    }
    if (task.startedAt) {
      this.logger.warn(
        'Core task already started during drain (should not happen)',
      )
    } else if (task.ownerIdentifier !== CORE_IDENTIFIER) {
      this.logger.warn(
        'Core task execution run for non-plaform task (should not happen)',
      )
    } else {
      const startedTimestamp = new Date()
      const startedTask = await this.ormService.db.transaction(async (tx) => {
        const updatedTaskResult = await tx
          .update(tasksTable)
          .set({ startedAt: startedTimestamp, updatedAt: startedTimestamp })
          .where(eq(tasksTable.id, taskId))
          .returning()

        const coreTaskStartLog: SystemLogEntry = {
          at: startedTimestamp,
          logType: 'started',
          message: 'Task is started',
        }

        await tx
          .update(tasksTable)
          .set({
            systemLog: sql<
              SystemLogEntry[]
            >`coalesce(${tasksTable.systemLog}, '[]'::jsonb) || ${JSON.stringify([coreTaskStartLog])}::jsonb`,
          })
          .where(eq(tasksTable.id, taskId))

        return updatedTaskResult[0]
      })

      if (!startedTask) {
        throw new Error(
          `Task by ID "${taskId}" not found when attempting to start.`,
        )
      }

      if (startedTask.targetLocationFolderId) {
        // notify folder rooms of updated task
        this.folderSocketService.sendToFolderRoom(
          startedTask.targetLocationFolderId,
          FolderPushMessage.TASK_UPDATED,
          { task: startedTask },
        )
      }
      // we have secured the task, so perform execution
      const processorName = startedTask.taskIdentifier as CoreTaskName

      const processor = this.processors[processorName]
      if (!processor) {
        throw new Error(`Processor not found by name "${processorName}".`)
      }
      const shouldRegisterComplete = processor.shouldRegisterComplete()
      this.runningTasksCount++
      await runWithThreadContext(crypto.randomUUID(), async () => {
        await processor
          .run(startedTask as CoreTask<CoreTaskName>)
          .then(() => {
            if (shouldRegisterComplete) {
              return this.taskService.registerTaskCompleted(taskId, {
                success: true,
                // result: processorResult?.result,
              })
            }
            return startedTask
          })
          .catch((error: unknown) => {
            // handle failure
            const isAlreadyCaptured = error instanceof AsyncWorkError
            const capturedError = isAlreadyCaptured
              ? error
              : buildUnexpectedError({
                  code: 'UNEXPECTED_ERROR_CORE_TASK_EXECUTION',
                  message: `Unexpected error while executing '${startedTask.taskIdentifier}' core task`,
                  error,
                })

            return this.taskService.registerTaskCompleted(taskId, {
              success: false,
              error: capturedError.toEnvelope(),
            })
          })
          .then((updatedTask) => {
            if (updatedTask.completedAt && !updatedTask.success) {
              this.logger.warn('Core task error:', { updatedTask })
            }
            // send a folder socket message to the frontend that the task status was updated
            if (startedTask.targetLocationFolderId) {
              // notify folder rooms of updated task
              this.folderSocketService.sendToFolderRoom(
                startedTask.targetLocationFolderId,
                FolderPushMessage.TASK_UPDATED,
                {
                  updatedTask,
                },
              )
            }
          })
          .finally(() => {
            this.runningTasksCount--
            void this.ormService.db.query.tasksTable
              .findFirst({
                where: eq(tasksTable.id, startedTask.id),
              })
              .then((finalTaskState) => {
                this.logger.debug(`Core task completed [${startedTask.id}]:`, {
                  task: {
                    identifier: finalTaskState?.taskIdentifier,
                    description: finalTaskState?.taskDescription,
                    startedAt: finalTaskState?.startedAt,
                    completedAt: finalTaskState?.completedAt,
                    success: finalTaskState?.success,
                    error: finalTaskState?.error,
                    systemLog: finalTaskState?.systemLog,
                  },
                })
              })
          })
      })
    }
  }

  registerProcessor = <K extends CoreTaskName>(
    taskName: K,
    processorFunction: BaseCoreTaskProcessor<K>,
  ) => {
    this.processors[taskName] =
      processorFunction as unknown as BaseCoreTaskProcessor<CoreTaskName>
  }
}
