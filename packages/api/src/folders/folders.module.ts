import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { appConfig } from 'src/app/config'
import { AppService } from 'src/app/services/app.service'
import { redisConfig } from 'src/cache/redis.config'
import { EventModule } from 'src/event/event.module'
import { EventService } from 'src/event/services/event.service'
import { QueueModule } from 'src/queue/queue.module'
import { StorageModule } from 'src/storage/storage.module'
import { ServerModule } from 'src/server/server.module'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { SocketModule } from 'src/socket/socket.module'
import { UserSocketService } from 'src/socket/user/user-socket.service'

import { FoldersController } from './controllers/folders.controller'
import { RescanFolderProcessor } from './processors/rescan-folder.processor'
import { FolderService } from './services/folder.service'

@Module({
  controllers: [FoldersController],
  imports: [
    StorageModule,
    ServerModule,
    QueueModule,
    ConfigModule.forFeature(redisConfig),
    ConfigModule.forFeature(appConfig),
    forwardRef(() => EventModule),
    forwardRef(() => SocketModule),
    forwardRef(() => AppModule),
  ],
  providers: [
    EventService,
    FolderService,
    UserSocketService,
    AppService,
    ServerConfigurationService,
    RescanFolderProcessor,
  ],
  exports: [FolderService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class FoldersModule {}
