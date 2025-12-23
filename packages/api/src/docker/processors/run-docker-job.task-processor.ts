import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { AppService } from 'src/app/services/app.service'
import { Event } from 'src/event/entities/event.entity'
import { BaseProcessor } from 'src/task/base.processor'
import { Task } from 'src/task/entities/task.entity'
import { PlatformTaskName } from 'src/task/task.constants'

@Injectable()
export class RunDockerJobProcessor extends BaseProcessor<PlatformTaskName.RunDockerJob> {
  private readonly appService: AppService
  constructor(
    @Inject(forwardRef(() => AppService))
    _appService,
  ) {
    super(PlatformTaskName.RunDockerJob)
    this.appService = _appService as AppService
  }
  async run(task: Task, event: Event) {
    const eventData = event.data as {
      profileIdentifier: string
      jobClassIdentifier: string
      appIdentifier: string
    }
    await this.appService.executeAppDockerJob({
      waitForCompletion: false,
      appIdentifier: eventData.appIdentifier,
      jobInputData: {
        folderId: event.subjectFolderId,
        objectKey: event.subjectObjectKey,
      },
      profileName: eventData.profileIdentifier,
      jobName: eventData.jobClassIdentifier,
      taskContext: {
        taskId: task.id,
      },
    })
  }
}
