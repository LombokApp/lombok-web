import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { AppModule } from 'src/app/app.module'
import { appConfig } from 'src/app/config'
import { AppService } from 'src/app/services/app.service'
import { AuthModule } from 'src/auth/auth.module'
import { authConfig } from 'src/auth/config'
import { JWTService } from 'src/auth/services/jwt.service'
import { coreConfig } from 'src/core/config'
import { CoreWorkerModule } from 'src/core-worker/core-worker.module'
import { DockerModule } from 'src/docker/docker.module'
import { DockerClientService } from 'src/docker/services/client/docker-client.service'
import { EventModule } from 'src/event/event.module'
import { EventService } from 'src/event/services/event.service'
import { FoldersModule } from 'src/folders/folders.module'
import { FolderService } from 'src/folders/services/folder.service'
import { LogModule } from 'src/log/log.module'
import { ServerModule } from 'src/server/server.module'
import { StorageProvisionService } from 'src/server/services/storage-provision.service'
import { StorageModule } from 'src/storage/storage.module'

import { AppSocketGateway } from './app/app-socket.gateway'
import { AppSocketService } from './app/app-socket.service'
import { AppUserSocketGateway } from './app-user/app-user-socket.gateway'
import { AppUserSocketService } from './app-user/app-user-socket.service'
import { RealtimeService } from './realtime.service'
import { UserSocketGateway } from './user/user-socket.gateway'
import { UserSocketService } from './user/user-socket.service'

@Module({
  controllers: [],
  imports: [
    StorageModule,
    forwardRef(() => FoldersModule),
    forwardRef(() => AppModule),
    forwardRef(() => AuthModule),
    forwardRef(() => EventModule),
    forwardRef(() => LogModule),
    forwardRef(() => ServerModule),
    forwardRef(() => DockerModule),
    forwardRef(() => CoreWorkerModule),
    ConfigModule.forFeature(authConfig),
    ConfigModule.forFeature(coreConfig),
    ConfigModule.forFeature(appConfig),
  ],
  providers: [
    JWTService,
    AppSocketService,
    UserSocketGateway,
    AppSocketGateway,
    AppUserSocketGateway,
    UserSocketService,
    AppUserSocketService,
    RealtimeService,
    DockerClientService,
    FolderService,
    EventService,
    AppService,
    StorageProvisionService,
  ],
  exports: [
    UserSocketService,
    RealtimeService,
    UserSocketGateway,
    AppSocketService,
    AppSocketGateway,
    AppUserSocketGateway,
    AppUserSocketService,
  ],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class SocketModule {}
