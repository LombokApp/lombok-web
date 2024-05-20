import { Processor } from '@nestjs/bullmq'
import type { Job } from 'bullmq'
import { BaseProcessor } from 'src/core/base-processor'
import { EventService } from 'src/event/services/event.service'
import { QueueName } from 'src/queue/queue.constants'

@Processor(QueueName.NotifyAllAppsOfPendingEvents)
export class NotifyAllAppsOfPendingEventsProcessor extends BaseProcessor {
  constructor(private readonly eventService: EventService) {
    super()
  }

  async process(_job: Job): Promise<void> {
    console.log('Executing notifyAllAppsOfPendingEvents...')
    await this.eventService.notifyAllAppsOfPendingEvents()
  }
}
