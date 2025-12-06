import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { AppService } from 'src/app/services/app.service'
import { Event } from 'src/event/entities/event.entity'
import { OrmService } from 'src/orm/orm.service'
import { BaseProcessor } from 'src/task/base.processor'
import { Task, tasksTable } from 'src/task/entities/task.entity'
import { PlatformTaskService } from 'src/task/services/platform-task.service'
import { PlatformTaskName } from 'src/task/task.constants'

@Injectable()
export class RunDockerJobProcessor extends BaseProcessor<PlatformTaskName.RunDockerJob> {
  private readonly appService: AppService

  constructor(
    private readonly ormService: OrmService,
    private readonly platformTaskService: PlatformTaskService,
    @Inject(forwardRef(() => AppService))
    _appService,
  ) {
    super(PlatformTaskName.RunDockerJob)
    this.appService = _appService as AppService
  }

  shouldRegisterComplete(): boolean {
    return false
  }

  async run(task: Task, event: Event) {
    const eventData = event.data as {
      innerTaskId: string
      profileIdentifier: string
      jobClassIdentifier: string
      appIdentifier: string
    }

    const innerTask = await this.ormService.db.query.tasksTable.findFirst({
      where: eq(tasksTable.id, eventData.innerTaskId),
    })

    if (!innerTask) {
      throw new NotFoundException(
        `Inner task not found: ${eventData.innerTaskId} for docker job task ${task.id}`,
      )
    }

    // Have the executor tell us if it accepted the job
    const { accepted } = await this.appService.executeAppDockerJob({
      appIdentifier: eventData.appIdentifier,
      jobInputData: {
        folderId: event.subjectFolderId,
        objectKey: event.subjectObjectKey,
      },
      profileIdentifier: eventData.profileIdentifier,
      jobIdentifier: eventData.jobClassIdentifier,
      asyncTaskId: task.id,
      storageAccessPolicy: innerTask.storageAccessPolicy,
    })

    if (!accepted) {
      await this.platformTaskService.registerTaskCompletion(task.id, {
        success: false,
        error: {
          // TODO: Improve this context
          code: 'DOCKER_JOB_NOT_ACCEPTED',
          message: 'Docker job not accepted',
        },
        requeue: {
          delayMs: 10000,
        },
      })
    }
  }
}
