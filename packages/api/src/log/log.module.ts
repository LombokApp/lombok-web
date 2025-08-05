import { forwardRef, Module } from '@nestjs/common'
import { AuthModule } from 'src/auth/auth.module'
import { FoldersModule } from 'src/folders/folders.module'
import { ServerModule } from 'src/server/server.module'
import { SocketModule } from 'src/socket/socket.module'
import { StorageModule } from 'src/storage/storage.module'

import { FolderLogsController } from './controllers/folder-logs.controller'
import { ServerLogsController } from './controllers/server-logs.controller'
import { LogEntryService } from './services/log-entry.service'

@Module({
  imports: [
    forwardRef(() => FoldersModule),
    forwardRef(() => StorageModule),
    forwardRef(() => SocketModule),
    forwardRef(() => ServerModule),
    AuthModule,
  ],
  controllers: [ServerLogsController, FolderLogsController],
  providers: [LogEntryService],
  exports: [LogEntryService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class LogModule {}
