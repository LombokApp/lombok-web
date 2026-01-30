import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { CacheModule } from 'src/cache/cache.module'
import { CoreWorkerModule } from 'src/core-worker/core-worker.module'
import { DockerModule } from 'src/docker/docker.module'
import { LogModule } from 'src/log/log.module'
import { SocketModule } from 'src/socket/socket.module'
import { StorageModule } from 'src/storage/storage.module'
import { TaskModule } from 'src/task/task.module'

import { AppModule } from '../app/app.module'
import { AuthModule } from '../auth/auth.module'
import { CommentsModule } from '../comments/comments.module'
import { EventModule } from '../event/event.module'
import { FoldersModule } from '../folders/folders.module'
import { OrmModule } from '../orm/orm.module'
import { ServerModule } from '../server/server.module'
import { UsersModule } from '../users/users.module'
import { coreConfig } from './config'
import { ZodSerializerInterceptor } from './serializer/serializer.util'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    ConfigModule.forFeature(coreConfig),
    CoreWorkerModule,
    AuthModule,
    OrmModule,
    FoldersModule,
    EventModule,
    AppModule,
    UsersModule,
    ServerModule,
    CacheModule,
    SocketModule,
    StorageModule,
    TaskModule,
    LogModule,
    DockerModule,
    CommentsModule,
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CoreModule {}
