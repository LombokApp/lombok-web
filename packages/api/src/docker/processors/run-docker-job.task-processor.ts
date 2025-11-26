import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { DockerOrchestrationService } from 'src/docker/services/docker-orchestration.service'
import { Event } from 'src/event/entities/event.entity'
import { BaseProcessor } from 'src/task/base.processor'
import { Task } from 'src/task/entities/task.entity'
import { PlatformTaskName } from 'src/task/task.constants'

@Injectable()
export class RunDockerJobProcessor extends BaseProcessor<PlatformTaskName.RunDockerJob> {
  private readonly dockerOrchestrationService: DockerOrchestrationService
  constructor(
    @Inject(forwardRef(() => DockerOrchestrationService))
    _dockerOrchestrationService,
  ) {
    super(PlatformTaskName.RunDockerJob)
    this.dockerOrchestrationService =
      _dockerOrchestrationService as DockerOrchestrationService
  }
  async run(task: Task, event: Event) {
    await this.dockerOrchestrationService.executeDockerJobAsync(
      task,
      event as Event & {
        data: { appIdentifier: string; profile: string; jobClass: string }
      },
    )
  }
}
