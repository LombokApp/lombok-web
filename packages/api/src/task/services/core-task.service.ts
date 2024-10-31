import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { FolderPushMessage } from '@stellariscloud/types'
import { and, count, eq, isNull } from 'drizzle-orm'
import {
  EventLevel,
  eventsTable,
  NewEvent,
} from 'src/event/entities/event.entity'
import { OrmService } from 'src/orm/orm.service'
import { FolderSocketService } from 'src/socket/folder/folder-socket.service'
import { CoreTaskName } from 'src/task/task.constants'
import { v4 as uuidV4 } from 'uuid'

import { BaseProcessor, ProcessorError } from '../base.processor'
import { NewTask, tasksTable } from '../entities/task.entity'

const MAX_CONCURRENT_CORE_TASKS = 10

@Injectable()
export class CoreTaskService {
  processors: { [key: string]: BaseProcessor<CoreTaskName> } = {}
  runningTasksCount = 0
  draining = false

  get folderSocketService(): FolderSocketService {
    return this._folderSocketService
  }
  constructor(
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => FolderSocketService))
    private readonly _folderSocketService,
  ) {}

  async drainCoreTasks() {
    try {
      if (this.draining) {
        return
      }
      this.draining = true
      await this._drainCoreTasks()
    } catch (error) {
      console.log('Error draining core tasks. Error', error)
    } finally {
      this.draining = false
    }
  }

  private async _drainCoreTasks() {
    const taskExecutionLimit = Math.max(
      MAX_CONCURRENT_CORE_TASKS - this.runningTasksCount,
      0,
    )
    if (taskExecutionLimit) {
      const coreTasksToExecute = await this.ormService.db
        .select({ taskId: tasksTable.id })
        .from(tasksTable)
        .where(
          and(
            isNull(tasksTable.startedAt),
            eq(tasksTable.ownerIdentifier, 'CORE'),
          ),
        )
        .limit(taskExecutionLimit)

      for (const { taskId } of coreTasksToExecute) {
        await this.executeCoreTask(taskId)
      }
    }
    const unstartedCoreTasksCount = await this.unstartedCoreTaskCount()
    if (unstartedCoreTasksCount) {
      void this.drainCoreTasks()
    }
  }

  async unstartedCoreTaskCount() {
    const [{ count: coreTaskCount }] = await this.ormService.db
      .select({
        count: count(),
      })
      .from(tasksTable)
      .where(
        and(
          isNull(tasksTable.startedAt),
          eq(tasksTable.ownerIdentifier, 'CORE'),
        ),
      )
    return coreTaskCount
  }

  async executeCoreTask(taskId: string) {
    const task = await this.ormService.db.query.tasksTable.findFirst({
      where: eq(tasksTable.id, taskId),
    })
    if (task?.startedAt) {
      console.log('Task already started.')
    } else if (task?.ownerIdentifier === 'CORE') {
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
        // console.log('Started core task!')
        // we have secured the task, so perform execution
        const processorName = task.taskKey
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

  async addAsyncTask<K extends CoreTaskName>(
    taskKey: K,
    inputData: CoreTaskInputData<K>,
    context: { folderId?: string; objectKey?: string; userId?: string } = {},
  ) {
    const now = new Date()

    const event: NewEvent = {
      id: uuidV4(),
      eventKey: `TRIGGER_CORE_TASK_${taskKey}`,
      data: inputData,
      emitterIdentifier: 'CORE',
      folderId: context.folderId,
      objectKey: context.objectKey,
      userId: context.userId,
      level: EventLevel.INFO,
      createdAt: now,
    }

    const task: NewTask = {
      id: uuidV4(),
      inputData,
      ownerIdentifier: 'CORE',
      taskDescription: {
        textKey: `Task '${taskKey}'`,
        variables: {},
      },
      subjectFolderId: context.folderId,
      subjectObjectKey: context.objectKey,
      taskKey,
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

    // kickoff core task processing
    void this.drainCoreTasks()
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  registerProcessor = async <K extends CoreTaskName>(
    taskName: K,
    // processorFunction: (inputData: CoreTaskInputData<K>) => Promise<void>,
    processorFunction: BaseProcessor<CoreTaskName>,
  ) => {
    console.log('Registering processor for:', taskName)
    this.processors[taskName] = processorFunction
  }
}

export type CoreTaskInputData<K extends CoreTaskName> =
  K extends CoreTaskName.RESCAN_FOLDER
    ? { folderId: string; userId: string }
    : never
