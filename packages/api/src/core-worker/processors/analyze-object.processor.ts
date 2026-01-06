import { NotReadyAsyncWorkError } from '@lombokapp/core-worker-utils'
import { Injectable, NotFoundException } from '@nestjs/common'
import { BaseCoreTaskProcessor } from 'src/task/base.processor'
import { CoreTaskName } from 'src/task/task.constants'

import { CoreWorkerService } from '../core-worker.service'

@Injectable()
export class AnalyzeObjectProcessor extends BaseCoreTaskProcessor<CoreTaskName.AnalyzeObject> {
  constructor(private readonly coreWorkerService: CoreWorkerService) {
    super(CoreTaskName.AnalyzeObject, async (task) => {
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

      if (!this.coreWorkerService.isReady()) {
        throw new NotReadyAsyncWorkError({
          message: 'Executor not ready to accept workloads',
          code: 'CORE_WORKER_NOT_READY',
          retry: true,
        })
      }

      await this.coreWorkerService.analyzeObject({
        folderId: eventData.folderId,
        objectKey: eventData.objectKey,
      })
    })
  }
}
