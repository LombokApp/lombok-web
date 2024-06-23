import type { OnModuleInit } from '@nestjs/common'
import { forwardRef, Inject, Module } from '@nestjs/common'
import * as nestjsConfig from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { AuthModule } from 'src/auth/auth.module'
import { coreConfig } from 'src/core/config/core.config'
import { QueueName } from 'src/queue/queue.constants'
import { QueueService } from 'src/queue/queue.service'

import { EventController } from './controllers/event.controller'
import { NotifyAllAppsOfPendingEventsProcessor } from './processors/notify-all-apps-of-pending-events.processor'
import { EventService } from './services/event.service'

@Module({
  imports: [
    forwardRef(() => AppModule),
    AuthModule,
    nestjsConfig.ConfigModule.forFeature(coreConfig),
  ],
  controllers: [EventController],
  providers: [EventService, NotifyAllAppsOfPendingEventsProcessor],
  exports: [EventService],
})
export class EventModule implements OnModuleInit {
  constructor(
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
    private readonly queueService: QueueService,
  ) {}

  onModuleInit() {
    if (this._coreConfig.initEventJobs) {
      void this.queueService.addJob(
        QueueName.NotifyAllAppsOfPendingEvents,
        undefined,
        {
          jobId: '__NotifyAllAppsOfPendingEvents__',
          repeat: {
            every: 5000,
            immediately: false,
          },
        },
      )
    }
  }
}
