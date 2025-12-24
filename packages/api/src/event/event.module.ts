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
import { AuthModule } from 'src/auth/auth.module'
import { authConfig } from 'src/auth/config'
import { FoldersModule } from 'src/folders/folders.module'
import { LogModule } from 'src/log/log.module'
import { platformConfig } from 'src/platform/config/platform.config'
import { ServerModule } from 'src/server/server.module'
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
    forwardRef(() => AuthModule),
    nestjsConfig.ConfigModule.forFeature(platformConfig),
    nestjsConfig.ConfigModule.forFeature(authConfig),
    nestjsConfig.ConfigModule.forFeature(appConfig),
    forwardRef(() => StorageModule),
    forwardRef(() => LogModule),
    forwardRef(() => ServerModule),
  ],
  controllers: [ServerEventsController, FolderEventsController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly eventService: EventService) {}

  jobs: CronJob[] | undefined = undefined

  onModuleDestroy() {
    this.jobs?.map((job) => job.stop())
  }

  onModuleInit() {
    const scheduleJob = new CronJob('* * * * *', async () => {
      await this.eventService.processScheduledTaskTriggers()
    })
    scheduleJob.start()
    this.jobs = [
      // evaluate schedule triggers every minute
      scheduleJob,
    ]
  }
}
