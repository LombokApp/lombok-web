import { Processor, WorkerHost } from '@nestjs/bullmq'
import type { Job } from 'bullmq'
import { EventService } from 'src/event/services/event.service'
import { QueueName } from 'src/queue/queue.constants'

@Processor(QueueName.NotifyAllAppsOfPendingEvents)
export class NotifyAllAppsOfPendingEventsProcessor extends WorkerHost {
  constructor(private readonly eventService: EventService) {
    super()
  }

  async process(_job: Job): Promise<void> {
    console.log('Runnning NotifyAllAppsOfPendingEvents')
    await this.eventService.notifyAllAppsOfPendingEvents()
  }
}
