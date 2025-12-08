import { TaskTrigger } from '@lombokapp/types'
import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import { AppService } from 'src/app/services/app.service'
import { EventService } from 'src/event/services/event.service'
import { OrmService } from 'src/orm/orm.service'
import { BaseProcessor } from 'src/task/base.processor'
import { Task } from 'src/task/entities/task.entity'
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

  // eslint-disable-next-line @typescript-eslint/require-await
  async run(task: Task, trigger: TaskTrigger) {
    if (trigger.kind !== 'event') {
      throw new NotFoundException(
        'QueueAppTaskProcessor requires event trigger',
      )
    }
    // const triggerData = trigger.data as {
    //   eventId?: string
    //   eventIdentifier?: string
    //   emitterIdentifier?: string
    //   payload: {
    //     appIdentifier: string
    //     taskIdentifier: string
    //     inputData: JsonSerializableObject
    //     storageAccessPolicy?: StorageAccessPolicy
    //   }
    //   userId?: string | null
    //   subjectFolderId?: string | null
    //   subjectObjectKey?: string | null
    // }
    // const eventPayload = triggerData.payload

    // const app = await this.appService.getApp(eventPayload.appIdentifier, {
    //   enabled: true,
    // })

    // if (!app) {
    //   throw new NotFoundException(
    //     `App not found: ${eventPayload.appIdentifier}`,
    //   )
    // }
    // const taskDefinition = app.config.tasks?.find(
    //   (_task) => _task.identifier === eventPayload.taskIdentifier,
    // )
    // if (!taskDefinition) {
    //   this.logger.error('Task definition not found:', {
    //     triggerData,
    //   })
    //   throw new NotFoundException(
    //     `Task definition not found: ${eventPayload.taskIdentifier}`,
    //   )
    // }

    // if (triggerData.userId) {
    //   await this.appService.validateAppUserAccess({
    //     appIdentifier: eventPayload.appIdentifier,
    //     userId: triggerData.userId,
    //   })
    // }

    // if (triggerData.subjectFolderId) {
    //   await this.appService.validateAppFolderAccess({
    //     appIdentifier: eventPayload.appIdentifier,
    //     folderId: triggerData.subjectFolderId,
    //   })
    // }

    // if (eventPayload.storageAccessPolicy?.length) {
    //   await this.appService.validateAppStorageAccessPolicy({
    //     appIdentifier: eventPayload.appIdentifier,
    //     storageAccessPolicy: eventPayload.storageAccessPolicy,
    //   })
    // }

    // await this.ormService.db.transaction(async (tx) => {
    //   const now = new Date()
    //   const newTask = {
    //     id: crypto.randomUUID(),
    //     ownerIdentifier: eventPayload.appIdentifier,
    //     taskDescription: taskDefinition.description,
    //     createdAt: now,
    //     updatedAt: now,
    //     handlerType: taskDefinition.handler.type,
    //     handlerIdentifier:
    //       taskDefinition.handler.type === 'worker' ||
    //       taskDefinition.handler.type === 'docker'
    //         ? taskDefinition.handler.identifier
    //         : '',
    //     trigger,
    //     subjectFolderId: triggerData.subjectFolderId ?? undefined,
    //     subjectObjectKey: triggerData.subjectObjectKey ?? undefined,
    //     taskIdentifier: eventPayload.taskIdentifier,
    //     inputData: eventPayload.inputData,
    //     storageAccessPolicy: eventPayload.storageAccessPolicy,
    //   }
    //   await tx.insert(tasksTable).values(newTask)
    //   if (
    //     taskDefinition.handler.type === 'worker' ||
    //     taskDefinition.handler.type === 'docker'
    //   ) {
    //     await this.eventService.emitRunnableTaskEnqueuedEvent(newTask, {
    //       tx,
    //     })
    //   }
    // })
  }
}
