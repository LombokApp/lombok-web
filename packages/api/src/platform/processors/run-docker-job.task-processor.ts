import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { Event } from 'src/event/entities/event.entity'
import { BaseProcessor } from 'src/task/base.processor'
import { Task } from 'src/task/entities/task.entity'
import { PlatformTaskName } from 'src/task/task.constants'

import { DockerOrchestrationService } from '../services/docker-orchestration.service'

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
    if (!event.subjectFolderId || !event.userId) {
      throw new Error('Missing folder id or user id.')
    }
    await this.dockerOrchestrationService.executeDockerJobAsync(task, event)
  }
}
