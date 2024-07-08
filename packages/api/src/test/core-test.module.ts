import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { CacheModule } from 'src/cache/cache.module'
import { QueueModule } from 'src/queue/queue.module'
import { S3Module } from 'src/s3/s3.module'
import { SocketModule } from 'src/socket/socket.module'

import { AppModule } from '../app/app.module'
import { AuthModule } from '../auth/auth.module'
import { ZodSerializerInterceptor } from '../core/serializer/serializer.util'
import { EventModule } from '../event/event.module'
import { FoldersModule } from '../folders/folders.module'
import { LocationsModule } from '../locations/locations.module'
import { OrmModule } from '../orm/orm.module'
import { ServerModule } from '../server/server.module'
import { UsersModule } from '../users/users.module'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    OrmModule,
    UsersModule,
    FoldersModule,
    EventModule,
    AppModule,
    LocationsModule,
    QueueModule,
    ServerModule,
    SocketModule,
    CacheModule,
    S3Module,
    AuthModule,
  ],
  exports: [],
  controllers: [],
  providers: [{ provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CoreTestModule {}
