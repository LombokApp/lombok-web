import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { appConfig } from 'src/app/config'
import { AppService } from 'src/app/services/app.service'
import { EventModule } from 'src/event/event.module'
import { EventService } from 'src/event/services/event.service'
import { ServerModule } from 'src/server/server.module'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { SocketModule } from 'src/socket/socket.module'
import { UserSocketService } from 'src/socket/user/user-socket.service'
import { StorageModule } from 'src/storage/storage.module'
import { TaskModule } from 'src/task/task.module'

import { FoldersController } from './controllers/folders.controller'
import { ReindexFolderProcessor } from './processors/reindex-folder.task-processor'
import { FolderService } from './services/folder.service'

@Module({
  controllers: [FoldersController],
  imports: [
    StorageModule,
    ServerModule,
    ConfigModule.forFeature(appConfig),
    forwardRef(() => TaskModule),
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
    ReindexFolderProcessor,
  ],
  exports: [FolderService, ReindexFolderProcessor],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class FoldersModule {}
