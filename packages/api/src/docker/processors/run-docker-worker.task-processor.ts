import {
  forwardRef,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import { eq } from 'drizzle-orm'
import { AppService } from 'src/app/services/app.service'
import { OrmService } from 'src/orm/orm.service'
import { BaseCoreTaskProcessor } from 'src/task/base.processor'
import { tasksTable } from 'src/task/entities/task.entity'
import { TaskService } from 'src/task/services/task.service'
import { CoreTaskName } from 'src/task/task.constants'

@Injectable()
export class RunDockerWorkerTaskProcessor extends BaseCoreTaskProcessor<CoreTaskName.RunDockerWorker> {
  private readonly appService: AppService

  constructor(
    private readonly ormService: OrmService,
    private readonly taskService: TaskService,
    @Inject(forwardRef(() => AppService))
    _appService,
  ) {
    super(CoreTaskName.RunDockerWorker, async (task) => {
      if (task.invocation.kind !== 'event') {
        throw new NotFoundException(
          'RunDockerJobProcessor requires event trigger',
        )
      }
      // const invokeContext = task.trigger.invokeContext
      // const eventData = invokeContext.eventData as {
      //   innerTaskId: string
      //   profileIdentifier: string
      //   jobClassIdentifier: string
      //   appIdentifier: string
      // }

      const innerTask = await this.ormService.db.query.tasksTable.findFirst({
        where: eq(tasksTable.id, task.data.innerTaskId),
      })

      if (!innerTask) {
        throw new NotFoundException(
          `Inner task not found: ${task.data.innerTaskId} for docker job task ${task.id}`,
        )
      }

      // Have the executor tell us if it accepted the job
      const execResult = await this.appService.executeAppDockerJob({
        appIdentifier: task.data.appIdentifier,
        jobData: innerTask.data,
        profileIdentifier: task.data.profileIdentifier,
        jobIdentifier: task.data.jobClassIdentifier,
        asyncTaskId: task.id,
        storageAccessPolicy: innerTask.storageAccessPolicy,
      })

      this.logger.debug(`Docker job processor exec complete [${task.id}]:`, {
        execResult,
      })

      if ('submitError' in execResult && execResult.submitError) {
        this.logger.error('Docker job not accepted:', { execResult })
        await this.taskService.registerTaskCompleted(task.id, {
          success: false,
          error: { ...execResult.submitError, name: 'SubmitError' },
          requeueDelayMs: 5000,
        })
      }
    })
    this.appService = _appService as AppService
  }

  shouldRegisterComplete(): boolean {
    return false
  }
}
