import { PLATFORM_IDENTIFIER } from '@lombokapp/types'
import {
  forwardRef,
  Module,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common'
import * as nestjsConfig from '@nestjs/config'
import { CronJob } from 'cron'
import { AppModule } from 'src/app/app.module'
import { appConfig } from 'src/app/config'
import { CoreAppService } from 'src/app/core-app.service'
import { AppService } from 'src/app/services/app.service'
import { AuthModule } from 'src/auth/auth.module'
import { authConfig } from 'src/auth/config'
import { FoldersModule } from 'src/folders/folders.module'
import { FolderService } from 'src/folders/services/folder.service'
import { LogModule } from 'src/log/log.module'
import { platformConfig } from 'src/platform/config/platform.config'
import { ServerModule } from 'src/server/server.module'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { SocketModule } from 'src/socket/socket.module'
import { StorageModule } from 'src/storage/storage.module'

import { FolderEventsController } from './controllers/folder-events.controller'
import { ServerEventsController } from './controllers/server-events.controller'
import { EventService } from './services/event.service'

@Module({
  imports: [
    forwardRef(() => AppModule),
    forwardRef(() => SocketModule),
    forwardRef(() => FoldersModule),
    AuthModule,
    nestjsConfig.ConfigModule.forFeature(platformConfig),
    nestjsConfig.ConfigModule.forFeature(authConfig),
    nestjsConfig.ConfigModule.forFeature(appConfig),
    forwardRef(() => StorageModule),
    forwardRef(() => LogModule),
    ServerModule,
  ],
  controllers: [ServerEventsController, FolderEventsController],
  providers: [
    EventService,
    FolderService,
    ServerConfigurationService,
    AppService,
    CoreAppService,
  ],
  exports: [EventService],
})
export class EventModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly eventService: EventService) {}

  jobs: CronJob[] | undefined = undefined

  onModuleDestroy() {
    this.jobs?.map((job) => job.stop())
  }

  onModuleInit() {
    // Periodic platform schedule events for apps to subscribe to
    this.jobs = [
      // every minute
      new CronJob(
        '* * * * *',
        () =>
          void this.eventService.emitEvent({
            emitterIdentifier: PLATFORM_IDENTIFIER,
            eventIdentifier: 'platform:schedule:every_minute',
            data: {},
          }),
        null,
        true,
      ),

      // every 5 minutes
      new CronJob(
        '*/5 * * * *',
        () =>
          void this.eventService.emitEvent({
            emitterIdentifier: PLATFORM_IDENTIFIER,
            eventIdentifier: 'platform:schedule:every_5_minutes',
            data: {},
          }),
        null,
        true,
      ),

      // hourly
      new CronJob(
        '0 * * * *',
        () =>
          void this.eventService.emitEvent({
            emitterIdentifier: PLATFORM_IDENTIFIER,
            eventIdentifier: 'platform:schedule:hourly',
            data: {},
          }),
        null,
        true,
      ),

      // daily at midnight
      new CronJob(
        '0 0 * * *',
        () =>
          void this.eventService.emitEvent({
            emitterIdentifier: PLATFORM_IDENTIFIER,
            eventIdentifier: 'platform:schedule:daily',
            data: {},
          }),
        null,
        true,
      ),
    ]
  }
}
