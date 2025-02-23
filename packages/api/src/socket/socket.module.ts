import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { appConfig } from 'src/app/config'
import { AppService } from 'src/app/services/app.service'
import { AuthModule } from 'src/auth/auth.module'
import { authConfig } from 'src/auth/config'
import { JWTService } from 'src/auth/services/jwt.service'
import { coreConfig } from 'src/core/config'
import { EventModule } from 'src/event/event.module'
import { EventService } from 'src/event/services/event.service'
import { FoldersModule } from 'src/folders/folders.module'
import { FolderService } from 'src/folders/services/folder.service'
import { ServerModule } from 'src/server/server.module'
import { ServerConfigurationService } from 'src/server/services/server-configuration.service'
import { StorageModule } from 'src/storage/storage.module'

import { AppSocketGateway } from './app/app-socket.gateway'
import { AppSocketService } from './app/app-socket.service'
import { FolderSocketGateway } from './folder/folder-socket.gateway'
import { FolderSocketService } from './folder/folder-socket.service'
import { UserSocketGateway } from './user/user-socket.gateway'
import { UserSocketService } from './user/user-socket.service'

@Module({
  controllers: [],
  imports: [
    forwardRef(() => FoldersModule),
    forwardRef(() => AppModule),
    forwardRef(() => AuthModule),
    ServerModule,
    StorageModule,
    EventModule,
    ConfigModule.forFeature(authConfig),
    ConfigModule.forFeature(coreConfig),
    ConfigModule.forFeature(appConfig),
  ],
  providers: [
    JWTService,
    AppSocketService,
    UserSocketGateway,
    FolderSocketGateway,
    AppSocketGateway,
    UserSocketService,
    FolderSocketService,
    FolderService,
    EventService,
    AppService,
    ServerConfigurationService,
  ],
  exports: [
    UserSocketService,
    FolderSocketService,
    FolderSocketGateway,
    UserSocketGateway,
    AppSocketService,
    AppSocketGateway,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SocketModule {}
