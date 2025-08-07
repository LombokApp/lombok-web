import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { FolderPushMessage, PLATFORM_IDENTIFIER } from '@stellariscloud/types'
import { and, count, eq, isNull } from 'drizzle-orm'
import { eventsTable, NewEvent } from 'src/event/entities/event.entity'
import { OrmService } from 'src/orm/orm.service'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import { PlatformTaskName } from 'src/task/task.constants'
import { v4 as uuidV4 } from 'uuid'

import { BaseProcessor, ProcessorError } from '../base.processor'
import { NewTask, tasksTable } from '../entities/task.entity'

const MAX_CONCURRENT_PLATFORM_TASKS = 10

export type PlatformTaskInputData<K extends PlatformTaskName> =
  K extends PlatformTaskName.REINDEX_FOLDER
    ? { folderId: string; userId: string }
    : never

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
    const task = await this.ormService.db.query.tasksTable.findFirst({
      where: eq(tasksTable.id, taskId),
    })
    if (task?.startedAt) {
      // console.log('Task already started.')
    } else if (task?.ownerIdentifier === PLATFORM_IDENTIFIER) {
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
          ._run(task.inputData)
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

  async addAsyncTask<K extends PlatformTaskName>(
    taskIdentifier: K,
    inputData: PlatformTaskInputData<K>,
    context: { folderId?: string; objectKey?: string; userId?: string } = {},
  ) {
    const now = new Date()

    const event: NewEvent = {
      id: uuidV4(),
      eventIdentifier: `TRIGGER_PLATFORM_TASK_${taskIdentifier}`,
      data: inputData,
      emitterIdentifier: 'platform',
      subjectFolderId: context.folderId,
      subjectObjectKey: context.objectKey,
      userId: context.userId,
      createdAt: now,
    }

    const task: NewTask = {
      id: uuidV4(),
      inputData,
      ownerIdentifier: 'platform',
      taskDescription: `Task '${taskIdentifier}'`,
      subjectFolderId: context.folderId,
      subjectObjectKey: context.objectKey,
      taskIdentifier,
      triggeringEventId: event.id,
      createdAt: now,
      updatedAt: now,
    }

    await this.ormService.db.transaction(async (tx) => {
      await tx.insert(eventsTable).values(event)
      await tx.insert(tasksTable).values(task)
    })

    if (context.folderId) {
      // notify folder rooms of new task
      this.folderSocketService.sendToFolderRoom(
        context.folderId,
        FolderPushMessage.TASK_ADDED,
        { task },
      )
    }

    // kickoff platform task processing
    void this.drainPlatformTasks()
  }

  registerProcessor = <K extends PlatformTaskName>(
    taskName: K,
    processorFunction: BaseProcessor<PlatformTaskName>,
  ) => {
    this.processors[taskName] = processorFunction
  }
}
