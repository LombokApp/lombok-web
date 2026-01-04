import { Injectable, NotFoundException } from '@nestjs/common'
import { BaseProcessor, TaskProcessorError } from 'src/task/base.processor'
import { PlatformTaskName } from 'src/task/task.constants'

import { CoreWorkerService } from '../core-worker.service'

@Injectable()
export class AnalyzeObjectProcessor extends BaseProcessor<PlatformTaskName.AnalyzeObject> {
  constructor(
    private readonly serverlessWorkerRunnerService: CoreWorkerService,
  ) {
    super(PlatformTaskName.AnalyzeObject, async (task) => {
      if (task.trigger.kind !== 'event') {
        throw new NotFoundException(
          'AnalyzeObjectProcessor requires event trigger',
        )
      }
      const invokeContext = task.trigger.invokeContext
      const eventData = invokeContext.eventData as {
        folderId: string
        objectKey: string
      }
      if (!eventData.folderId || !eventData.objectKey) {
        throw new NotFoundException(
          'AnalyzeObjectProcessor requires folderId and objectKey',
        )
      }

      if (!this.serverlessWorkerRunnerService.isReady()) {
        throw new TaskProcessorError(
          'CORE_WORKER_UNAVAILABLE',
          'Core worker runner not available',
        )
      }

      await this.serverlessWorkerRunnerService.analyzeObject({
        folderId: eventData.folderId,
        objectKey: eventData.objectKey,
      })
    })
  }
}
