import { forwardRef, Module } from '@nestjs/common'
import * as nestjsConfig from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { appConfig } from 'src/app/config'
import { AppService } from 'src/app/services/app.service'
import { AuthModule } from 'src/auth/auth.module'
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
import { CoreAppService } from 'src/app/core-app.service'
import { authConfig } from 'src/auth/config'

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
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class EventModule {}
