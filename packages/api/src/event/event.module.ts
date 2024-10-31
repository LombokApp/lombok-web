import { forwardRef, Module } from '@nestjs/common'
import * as nestjsConfig from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { AuthModule } from 'src/auth/auth.module'
import { coreConfig } from 'src/core/config/core.config'
import { SocketModule } from 'src/socket/socket.module'

import { ServerEventsController } from './controllers/server-events.controller'
import { EventService } from './services/event.service'

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
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class EventModule {}
