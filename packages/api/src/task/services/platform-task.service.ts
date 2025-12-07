import {
  FolderPushMessage,
  JsonSerializableObject,
  PLATFORM_IDENTIFIER,
  SystemLogEntry,
} from '@lombokapp/types'
import { Maybe } from '@lombokapp/utils'
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { and, count, eq, isNull, sql } from 'drizzle-orm'
import { AppService } from 'src/app/services/app.service'
import { eventsTable } from 'src/event/entities/event.entity'
import { EventService } from 'src/event/services/event.service'
import { OrmService } from 'src/orm/orm.service'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import { PlatformTaskName } from 'src/task/task.constants'

import { BaseProcessor, TaskProcessorError } from '../base.processor'
import { tasksTable } from '../entities/task.entity'

type RequeueConfig =
  | { shouldRequeue: true; delayMs: number; notBefore: Date | undefined }
  | { shouldRequeue: false }

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
    private readonly eventService: EventService,
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
    const [{ count: unstartedPlatformTaskCount }] = await this.ormService.db
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
    return unstartedPlatformTaskCount
  }

  async registerTaskCompletion(
    taskId: string,
    completion:
      | {
          success: false
          requeue?: { delayMs: number }
          error: {
            code: string
            message: string
            details?: JsonSerializableObject
          }
        }
      | {
          success: true
          result?: JsonSerializableObject
        },
    options: { tx?: OrmService['db'] } = { tx: undefined },
  ) {
    const db = options.tx ?? this.ormService.db
    const now = new Date()
    await db.transaction(async (tx) => {
      const task = await tx.query.tasksTable.findFirst({
        where: and(
          eq(tasksTable.id, taskId),
          eq(tasksTable.ownerIdentifier, PLATFORM_IDENTIFIER),
        ),
      })
      if (!task) {
        throw new Error(`Platform task not found by ID "${taskId}".`)
      }

      if (!task.startedAt) {
        throw new Error(`Task "${taskId}" has not been started.`)
      }

      if (task.completedAt) {
        throw new Error(`Task "${taskId}" has already been completed.`)
      }

      const app = await this.appService.getApp(task.ownerIdentifier, {
        enabled: true,
      })

      const taskDefinition = app?.config.tasks?.find(
        (_task) => _task.identifier === task.taskIdentifier,
      )
      if (!taskDefinition) {
        throw new Error(
          `Task definition not found for task "${task.taskIdentifier}".`,
        )
      }

      // enqueue the completion handler task if one was configured for this task
      const completionHandlerTaskDefinition =
        taskDefinition.handler.type === 'worker' ||
        taskDefinition.handler.type === 'docker'

      if (completionHandlerTaskDefinition) {
        await this.eventService.emitEvent({
          emitterIdentifier: PLATFORM_IDENTIFIER,
          eventIdentifier: `${PLATFORM_IDENTIFIER}:queue_app_task_completion_handler`,
          data: {
            appIdentifier: task.ownerIdentifier,
            taskIdentifier: completionHandlerTaskDefinition.identifier,
            completedTask: {
              id: task.id,
              success: completion.success,
              ...(completion.success
                ? { result: completion.result ?? null }
                : { error: completion.error }),
            },
          },
          ...(task.subjectFolderId && {
            subjectContext: {
              folderId: task.subjectFolderId,
              ...(task.subjectObjectKey && {
                objectKey: task.subjectObjectKey,
              }),
            },
          }),
        })
      }
      // build the task system log
      const completionSystemLog: SystemLogEntry = {
        at: now,
        payload: completion.success
          ? {
              logType: 'success',
              data: completion.result
                ? {
                    result: completion.result,
                  }
                : undefined,
            }
          : {
              logType: 'failure',
              data: {
                error: completion.error,
              },
            },
      }

      const requeueConfig: RequeueConfig =
        !completion.success && completion.requeue
          ? ({
              shouldRequeue: true,
              delayMs: Math.max(completion.requeue.delayMs, 0),
              notBefore:
                completion.requeue.delayMs > 0
                  ? new Date(now.getTime() + completion.requeue.delayMs)
                  : undefined,
            } as const)
          : { shouldRequeue: false }

      const systemLogs = [completionSystemLog].concat(
        requeueConfig.shouldRequeue
          ? [
              {
                at: now,
                payload: {
                  logType: 'requeue',
                  data: {
                    delayMs: requeueConfig.delayMs,
                    dontStartBefore:
                      requeueConfig.notBefore?.toISOString() ?? null,
                  },
                },
              },
            ]
          : [],
      )

      await tx
        .update(tasksTable)
        .set({
          updatedAt: now,
          ...(completion.success
            ? {
                success: true,
                completedAt: now,
                error: null,
              }
            : {
                success: false,
                error: {
                  code: completion.error.code,
                  message: completion.error.message,
                  details: completion.error.details,
                },
                ...(requeueConfig.shouldRequeue
                  ? {
                      dontStartBefore: requeueConfig.notBefore,
                      startedAt: null,
                    }
                  : {}),
              }),
          systemLog: sql<
            SystemLogEntry[]
          >`coalesce(${tasksTable.systemLog}, '[]'::jsonb) || ${JSON.stringify(systemLogs)}::jsonb`,
        })
        .where(eq(tasksTable.id, taskId))
    })
  }

  async executePlatformTask(taskId: string) {
    const rows = await this.ormService.db
      .select({ task: tasksTable, event: eventsTable })
      .from(tasksTable)
      .innerJoin(eventsTable, eq(tasksTable.eventId, eventsTable.id))
      .where(eq(tasksTable.id, taskId))
      .limit(1)

    const row = rows[0] as Maybe<(typeof rows)[number]>
    if (!row) {
      throw new Error(`Task not found by ID "${taskId}".`)
    }
    if (row.task.startedAt) {
      this.logger.warn(
        'Platform task already started during drain (should not happen)',
      )
    } else if (row.task.ownerIdentifier !== PLATFORM_IDENTIFIER) {
      this.logger.warn(
        'Platform task execution run for non-plaform task (should not happen)',
      )
    } else {
      const startedTimestamp = new Date()
      const task = await this.ormService.db.transaction(async (tx) => {
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

      if (task.subjectFolderId) {
        // notify folder rooms of updated task
        this.folderSocketService.sendToFolderRoom(
          task.subjectFolderId,
          FolderPushMessage.TASK_UPDATED,
          { task },
        )
      }
      // we have secured the task, so perform execution
      const processorName = task.taskIdentifier

      const processor = this.processors[processorName]
      const shouldRegisterComplete = processor.shouldRegisterComplete()
      this.runningTasksCount++
      await processor
        ._run(task, row.event)
        .then((processorResult) => {
          if (shouldRegisterComplete) {
            return this.registerTaskCompletion(taskId, {
              success: true,
              result: processorResult?.result,
            })
          }
        })
        .catch((error: Error | TaskProcessorError) => {
          // handle failure
          const errorTimestamp = new Date()
          const isCaughtError = error instanceof TaskProcessorError
          return this.ormService.db
            .update(tasksTable)
            .set({
              error: {
                code: isCaughtError ? error.code : error.name,
                message: error.message,
                details: isCaughtError ? error.details : undefined,
              },
              updatedAt: errorTimestamp,
            })
            .where(eq(tasksTable.id, taskId))
        })
        .finally(() => {
          // send a folder socket message to the frontend that the task status was updated
          if (task.subjectFolderId) {
            void this.ormService.db.query.tasksTable
              .findFirst({
                where: eq(tasksTable.id, taskId),
              })
              .then((_task) => {
                if (task.subjectFolderId) {
                  // notify folder rooms of updated task
                  this.folderSocketService.sendToFolderRoom(
                    task.subjectFolderId,
                    FolderPushMessage.TASK_UPDATED,
                    {
                      task: _task,
                    },
                  )
                }
              })
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
