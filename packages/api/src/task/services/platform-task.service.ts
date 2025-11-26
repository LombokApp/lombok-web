import { FolderPushMessage, PLATFORM_IDENTIFIER } from '@lombokapp/types'
import { Maybe } from '@lombokapp/utils'
import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { and, count, eq, isNull } from 'drizzle-orm'
import { eventsTable } from 'src/event/entities/event.entity'
import { OrmService } from 'src/orm/orm.service'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import { PlatformTaskName } from 'src/task/task.constants'

import { BaseProcessor, ProcessorError } from '../base.processor'
import { tasksTable } from '../entities/task.entity'

const MAX_CONCURRENT_PLATFORM_TASKS = 10
@Injectable()
export class PlatformTaskService {
  processors: Record<string, BaseProcessor<PlatformTaskName>> = {}
  runningTasksCount = 0
  draining = false

  get folderSocketService(): FolderSocketService {
    return this._folderSocketService as FolderSocketService
  }
  constructor(
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => FolderSocketService))
    private readonly _folderSocketService,
  ) {}

  async drainPlatformTasks() {
    try {
      if (this.draining) {
        return
      }
      this.draining = true
      await this._drainPlatformTasks()
    } catch (error: unknown) {
      // eslint-disable-next-line no-console
      console.log('Error draining platform tasks. Error', error)
    } finally {
      this.draining = false
    }
  }

  private async _drainPlatformTasks() {
    const taskExecutionLimit = Math.max(
      MAX_CONCURRENT_PLATFORM_TASKS - this.runningTasksCount,
      0,
    )
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
      }
    }
    const unstartedPlatformTasksCount = await this.unstartedPlatformTaskCount()
    if (unstartedPlatformTasksCount) {
      void this.drainPlatformTasks()
    }
  }

  async unstartedPlatformTaskCount() {
    const [{ count: platformTaskCount }] = await this.ormService.db
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
    return platformTaskCount
  }

  async executePlatformTask(taskId: string) {
    const rows = await this.ormService.db
      .select({ task: tasksTable, event: eventsTable })
      .from(tasksTable)
      .innerJoin(eventsTable, eq(tasksTable.triggeringEventId, eventsTable.id))
      .where(eq(tasksTable.id, taskId))
      .limit(1)
    const row = rows[0] as Maybe<(typeof rows)[number]>
    if (!row) {
      throw new Error(`Task not found by ID "${taskId}".`)
    }
    const { task, event } = row
    if (task.startedAt) {
      // console.log('Task already started.')
    } else if (task.ownerIdentifier === PLATFORM_IDENTIFIER) {
      const startedTimestamp = new Date()
      const updateResult = await this.ormService.db
        .update(tasksTable)
        .set({ startedAt: startedTimestamp, updatedAt: startedTimestamp })
        .where(eq(tasksTable.id, taskId))
        .returning()

      if (updateResult.length) {
        if (updateResult[0].subjectFolderId) {
          // notify folder rooms of updated task
          this.folderSocketService.sendToFolderRoom(
            updateResult[0].subjectFolderId,
            FolderPushMessage.TASK_UPDATED,
            { task },
          )
        }
        // we have secured the task, so perform execution
        const processorName = task.taskIdentifier

        const processor = this.processors[processorName]
        this.runningTasksCount++
        await processor
          ._run(task, event)
          .then(() => {
            // handle successful completion
            const completedTimestamp = new Date()
            return this.ormService.db
              .update(tasksTable)
              .set({
                completedAt: completedTimestamp,
                updatedAt: completedTimestamp,
              })
              .where(eq(tasksTable.id, taskId))
          })
          .catch((error: Error | ProcessorError) => {
            // handle failure
            const errorTimestamp = new Date()
            const isCaughtError = error instanceof ProcessorError
            return this.ormService.db
              .update(tasksTable)
              .set({
                errorAt: errorTimestamp,
                updatedAt: errorTimestamp,
                errorCode: isCaughtError ? error.code : error.name,
                errorMessage: error.message,
              })
              .where(eq(tasksTable.id, taskId))
          })
          .finally(() => {
            // send a folder socket message to the frontend that the task status was updated
            if (updateResult[0].subjectFolderId) {
              void this.ormService.db.query.tasksTable
                .findFirst({
                  where: eq(tasksTable.id, taskId),
                })
                .then((_task) => {
                  if (updateResult[0].subjectFolderId) {
                    // notify folder rooms of updated task
                    this.folderSocketService.sendToFolderRoom(
                      updateResult[0].subjectFolderId,
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
    } else {
      throw new Error(`Task not found by ID "${taskId}".`)
    }
  }

  registerProcessor = <K extends PlatformTaskName>(
    taskName: K,
    processorFunction: BaseProcessor<PlatformTaskName>,
  ) => {
    this.processors[taskName] = processorFunction
  }
}
