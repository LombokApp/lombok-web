import { JsonSerializableObject, StorageAccessPolicy } from '@lombokapp/types'
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { AppService } from 'src/app/services/app.service'
import { Event } from 'src/event/entities/event.entity'
import { EventService } from 'src/event/services/event.service'
import { OrmService } from 'src/orm/orm.service'
import { BaseProcessor } from 'src/task/base.processor'
import { Task, tasksTable } from 'src/task/entities/task.entity'
import { PlatformTaskName } from 'src/task/task.constants'

@Injectable()
export class QueueAppTaskProcessor extends BaseProcessor<PlatformTaskName.QueueAppTask> {
  private readonly appService: AppService
  private readonly ormService: OrmService
  private readonly logger = new Logger(QueueAppTaskProcessor.name)
  private readonly eventService: EventService
  constructor(
    @Inject(forwardRef(() => AppService))
    _appService,
    @Inject(forwardRef(() => OrmService))
    _ormService,
    @Inject(forwardRef(() => EventService))
    _eventService,
  ) {
    super(PlatformTaskName.QueueAppTask)
    this.appService = _appService as AppService
    this.ormService = _ormService as OrmService
    this.eventService = _eventService as EventService
  }

  async run(task: Task, event: Event) {
    const eventData = event.data as {
      appIdentifier: string
      taskIdentifier: string
      inputData: JsonSerializableObject
      storageAccessPolicy?: StorageAccessPolicy
    }

    const app = await this.appService.getApp(eventData.appIdentifier, {
      enabled: true,
    })

    if (!app) {
      throw new NotFoundException(`App not found: ${eventData.appIdentifier}`)
    }
    const taskDefinition = app.config.tasks?.find(
      (_task) => _task.identifier === eventData.taskIdentifier,
    )
    if (!taskDefinition) {
      this.logger.error('Task definition not found:', {
        eventData,
      })
      throw new NotFoundException(
        `Task definition not found: ${eventData.taskIdentifier}`,
      )
    }

    if (event.userId) {
      await this.appService.validateAppUserAccess({
        appIdentifier: eventData.appIdentifier,
        userId: event.userId,
      })
    }

    if (event.subjectFolderId) {
      await this.appService.validateAppFolderAccess({
        appIdentifier: eventData.appIdentifier,
        folderId: event.subjectFolderId,
      })
    }

    if (eventData.storageAccessPolicy?.length) {
      await this.appService.validateAppStorageAccessPolicy({
        appIdentifier: eventData.appIdentifier,
        storageAccessPolicy: eventData.storageAccessPolicy,
      })
    }

    await this.ormService.db.transaction(async (tx) => {
      const now = new Date()
      const newTask = {
        id: crypto.randomUUID(),
        ownerIdentifier: eventData.appIdentifier,
        taskDescription: taskDefinition.description,
        createdAt: now,
        updatedAt: now,
        handlerType: taskDefinition.handler.type,
        handlerIdentifier:
          taskDefinition.handler.type === 'worker' ||
          taskDefinition.handler.type === 'docker'
            ? taskDefinition.handler.identifier
            : '',
        eventId: event.id,
        subjectFolderId: event.subjectFolderId,
        subjectObjectKey: event.subjectObjectKey,
        taskIdentifier: eventData.taskIdentifier,
        inputData: eventData.inputData,
        storageAccessPolicy: eventData.storageAccessPolicy,
      }
      await tx.insert(tasksTable).values(newTask)
      if (
        taskDefinition.handler.type === 'worker' ||
        taskDefinition.handler.type === 'docker'
      ) {
        await this.eventService.emitRunnableTaskEnqueuedEvent(newTask, {
          tx,
        })
      }
    })
  }
}
