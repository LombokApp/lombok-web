import type { OnModuleInit } from '@nestjs/common'
import { forwardRef, Module } from '@nestjs/common'
import { AppModule } from 'src/app/app.module'
import { QueueName } from 'src/queue/queue.constants'
import { QueueService } from 'src/queue/queue.service'

import { EventController } from './controllers/event.controller'
import { NotifyAllAppsOfPendingEventsProcessor } from './processors/notify-all-apps-of-pending-events.processor'
import { EventService } from './services/event.service'

@Module({
  imports: [forwardRef(() => AppModule)],
  controllers: [EventController],
  providers: [EventService, NotifyAllAppsOfPendingEventsProcessor],
  exports: [EventService],
})
export class EventModule implements OnModuleInit {
  constructor(private readonly queueService: QueueService) {}

  onModuleInit() {
    void this.queueService.addJob(
      QueueName.NotifyAllAppsOfPendingEvents,
      undefined,
      {
        repeat: {
          every: 5000,
        },
      },
    )
  }
}
