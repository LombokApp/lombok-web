import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { appConfig } from 'src/app/config'
import { AppService } from 'src/app/services/app.service'
import { authConfig } from 'src/auth/config'
import { coreConfig } from 'src/core/config'
import { CoreWorkerModule } from 'src/core-worker/core-worker.module'
import { DockerModule } from 'src/docker/docker.module'
import { EventModule } from 'src/event/event.module'
import { EventService } from 'src/event/services/event.service'
import { LogEntryService } from 'src/log/services/log-entry.service'
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
    ConfigModule.forFeature(coreConfig),
    ConfigModule.forFeature(authConfig),
    forwardRef(() => CoreWorkerModule),
    forwardRef(() => ServerModule),
    forwardRef(() => TaskModule),
    forwardRef(() => EventModule),
    forwardRef(() => SocketModule),
    forwardRef(() => AppModule),
    forwardRef(() => DockerModule),
  ],
  providers: [
    EventService,
    FolderService,
    AppService,
    LogEntryService,
    ReindexFolderProcessor,
  ],
  exports: [FolderService, ReindexFolderProcessor],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class FoldersModule {}
