import type { OnModuleInit } from '@nestjs/common'
import { forwardRef, Inject, Module } from '@nestjs/common'
import * as nestjsConfig from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { AuthModule } from 'src/auth/auth.module'
import { coreConfig } from 'src/core/config/core.config'
import { CoreTaskService } from 'src/task/services/core-task.service'
import { TaskModule } from 'src/task/task.module'

import { ServerEventsController } from './controllers/server-events.controller'
import { EventService } from './services/event.service'
import { SocketModule } from 'src/socket/socket.module'

@Module({
  imports: [
    forwardRef(() => AppModule),
    forwardRef(() => SocketModule),
    AuthModule,
    nestjsConfig.ConfigModule.forFeature(coreConfig),
  ],
  controllers: [ServerEventsController],
  providers: [EventService],
  exports: [EventService],
})
export class EventModule {
  constructor() {}
}
