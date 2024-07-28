import { Processor } from '@nestjs/bullmq'
import type { Job } from 'bullmq'
import { BaseProcessor } from 'src/core/base-processor'
import { QueueName } from 'src/queue/queue.constants'

import { AppSocketService } from '../app/app-socket.service'

@Processor(QueueName.NotifyAppOfPendingEvents)
export class NotifyPendingEventsProcessor extends BaseProcessor {
  constructor(private readonly appSocketService: AppSocketService) {
    super()
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async process(
    job: Job<{ appIdentifier: string; eventKey: string; eventCount: number }>,
  ): Promise<void> {
    console.log('Runnning notifyAppWorkersOfPendingEvents:', job.data)
    this.appSocketService.notifyAppWorkersOfPendingEvents(
      job.data.appIdentifier,
      job.data.eventKey,
      job.data.eventCount,
    )
  }
}
