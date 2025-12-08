import { TaskTrigger } from '@lombokapp/types'
import { forwardRef, Inject, Injectable, Logger } from '@nestjs/common'
import { AppService } from 'src/app/services/app.service'
import { EventService } from 'src/event/services/event.service'
import { OrmService } from 'src/orm/orm.service'
import { BaseProcessor } from 'src/task/base.processor'
import { Task } from 'src/task/entities/task.entity'
import { PlatformTaskName } from 'src/task/task.constants'

@Injectable()
export class QueueAppTaskCompletionHandlerTaskProcessor extends BaseProcessor<PlatformTaskName.QueueAppTaskCompletionHandler> {
  private readonly appService: AppService
  private readonly ormService: OrmService
  private readonly logger = new Logger(
    QueueAppTaskCompletionHandlerTaskProcessor.name,
  )
  private readonly eventService: EventService
  constructor(
    @Inject(forwardRef(() => AppService))
    _appService,
    @Inject(forwardRef(() => OrmService))
    _ormService,
    @Inject(forwardRef(() => EventService))
    _eventService,
  ) {
    super(PlatformTaskName.QueueAppTaskCompletionHandler)
    this.appService = _appService as AppService
    this.ormService = _ormService as OrmService
    this.eventService = _eventService as EventService
  }

  async run(_task: Task, _trigger: TaskTrigger) {
    // if (trigger.kind !== 'event') {
    //   throw new NotFoundException(
    //     'QueueAppTaskCompletionHandlerTaskProcessor requires event trigger',
    //   )
    // }
    // const triggerData = trigger.data
    // const eventData = triggerData.eventData
    // const app = await this.appService.getApp(triggerData.appIdentifier, {
    //   enabled: true,
    // })
    // if (!app) {
    //   throw new NotFoundException(`App not found: ${eventData.appIdentifier}`)
    // }
    // const taskDefinition = app.config.tasks?.find(
    //   (_task) => _task.identifier === eventData.taskIdentifier,
    // )
    // if (!taskDefinition) {
    //   this.logger.error('Task definition not found:', {
    //     eventData,
    //   })
    //   throw new NotFoundException(
    //     `Task definition not found: ${eventData.taskIdentifier}`,
    //   )
    // }
    // if (triggerData.userId) {
    //   await this.appService.validateAppUserAccess({
    //     appIdentifier: eventData.appIdentifier,
    //     userId: triggerData.userId,
    //   })
    // }
    // if (triggerData.subjectFolderId) {
    //   await this.appService.validateAppFolderAccess({
    //     appIdentifier: eventData.appIdentifier,
    //     folderId: triggerData.subjectFolderId,
    //   })
    // }
    // await this.ormService.db.transaction(async (tx) => {
    //   const now = new Date()
    //   const newTask = {
    //     id: crypto.randomUUID(),
    //     ownerIdentifier: eventData.appIdentifier,
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
    //     taskIdentifier: eventData.taskIdentifier,
    //     inputData: {
    //       completedTask: eventData.completedTask,
    //     },
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
