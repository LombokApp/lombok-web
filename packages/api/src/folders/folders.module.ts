import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { appConfig } from 'src/app/config'
import { CoreAppService } from 'src/app/core-app.service'
import { AppService } from 'src/app/services/app.service'
import { authConfig } from 'src/auth/config'
import { EventModule } from 'src/event/event.module'
import { EventService } from 'src/event/services/event.service'
import { LogEntryService } from 'src/log/services/log-entry.service'
import { platformConfig } from 'src/platform/config'
import { ServerModule } from 'src/server/server.module'
import { SocketModule } from 'src/socket/socket.module'
import { StorageModule } from 'src/storage/storage.module'
import { TaskModule } from 'src/task/task.module'

import { FoldersController } from './controllers/folders.controller'
import { ReindexFolderProcessor } from './processors/reindex-folder.task-processor'
import { FolderService } from './services/folder.service'

@Module({
  controllers: [FoldersController],
  imports: [
    StorageModule,
    ConfigModule.forFeature(appConfig),
    ConfigModule.forFeature(platformConfig),
    ConfigModule.forFeature(authConfig),
    forwardRef(() => ServerModule),
    forwardRef(() => TaskModule),
    forwardRef(() => EventModule),
    forwardRef(() => SocketModule),
    forwardRef(() => AppModule),
  ],
  providers: [
    EventService,
    FolderService,
    AppService,
    LogEntryService,
    ReindexFolderProcessor,
    CoreAppService,
  ],
  exports: [FolderService, ReindexFolderProcessor],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class FoldersModule {}
