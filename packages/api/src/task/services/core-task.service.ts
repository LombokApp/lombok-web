import { CORE_IDENTIFIER, SystemLogEntry } from '@lombokapp/types'
import { AsyncWorkError, buildUnexpectedError } from '@lombokapp/worker-utils'
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { and, count, eq, isNull, lt, lte, or, sql } from 'drizzle-orm'
import { AppService } from 'src/app/services/app.service'
import { OrmService } from 'src/orm/orm.service'
import { runWithThreadContext } from 'src/shared/thread-context'
import { RealtimeService } from 'src/socket/realtime.service'
import { CoreTaskName, MAX_TASK_ATTEMPTS } from 'src/task/task.constants'

import type { CoreTask } from '../base.processor'
import { BaseCoreTaskProcessor } from '../base.processor'
import { tasksTable } from '../entities/task.entity'
import { serializeLogEntry } from '../util/log-encoder.util'
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

  realtimeService: RealtimeService
  taskService: TaskService
  appService: AppService
  constructor(
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => AppService))
    _appService,
    @Inject(forwardRef(() => TaskService))
    _taskService,
    @Inject(forwardRef(() => RealtimeService))
    _realtimeService,
  ) {
    this.realtimeService = _realtimeService as RealtimeService
    this.taskService = _taskService as TaskService
    this.appService = _appService as AppService
  }

  async startDrainCoreTasks() {
    await this.ormService.waitForInit()
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

  /**
   * Predicate for core tasks that are eligible to start now.
   *
   * `dont_start_before` is compared against the Node clock (`new Date()`), NOT
   * Postgres `NOW()`. Those columns are written from the Node clock, so the
   * comparison must use the same clock — on hosts where the Postgres and Node
   * clocks drift apart, `NOW()` lets tasks start before their
   * `dont_start_before` delay. For self-requeuing batch tasks (e.g. event
   * notifications) that turns the requeue delay into a no-op and the drain
   * spins, producing dozens of redundant tasks per debounce window.
   */
  private startableCoreTaskWhere() {
    return and(
      isNull(tasksTable.startedAt),
      lt(tasksTable.attemptCount, MAX_TASK_ATTEMPTS),
      or(
        isNull(tasksTable.dontStartBefore),
        lte(tasksTable.dontStartBefore, new Date()),
      ),
      eq(tasksTable.ownerId, CORE_IDENTIFIER),
    )
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
        .where(this.startableCoreTaskWhere())
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
      .where(this.startableCoreTaskWhere())
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
    } else if (task.ownerId !== CORE_IDENTIFIER) {
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
          payload: {
            executorMetadata: {
              type: 'system',
              metadata: {},
            },
          },
        }

        await tx
          .update(tasksTable)
          .set({
            systemLog: sql<
              SystemLogEntry[]
            >`coalesce(${tasksTable.systemLog}, '[]'::jsonb) || ${JSON.stringify([serializeLogEntry(coreTaskStartLog)])}::jsonb`,
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
        this.realtimeService.toFolder(startedTask.targetLocationFolderId, {
          resource: 'folder.task',
          action: 'updated',
          id: startedTask.id,
          data: { taskIdentifier: startedTask.taskIdentifier },
        })
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
                executorMetadata: {
                  type: 'system',
                  metadata: {},
                },
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
              executorMetadata: {
                type: 'system',
                metadata: {},
              },
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
              this.realtimeService.toFolder(
                startedTask.targetLocationFolderId,
                {
                  resource: 'folder.task',
                  action: 'updated',
                  id: startedTask.id,
                  data: { taskIdentifier: startedTask.taskIdentifier },
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
