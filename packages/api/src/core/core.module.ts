import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { ConfigModule } from '@nestjs/config'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { CacheModule } from 'src/cache/cache.module'
import { redisConfig } from 'src/cache/redis.config'
import { QueueModule } from 'src/queue/queue.module'
import { SocketModule } from 'src/socket/socket.module'
import { StorageModule } from 'src/storage/storage.module'

import { AppModule } from '../app/app.module'
import { AuthModule } from '../auth/auth.module'
import { EventModule } from '../event/event.module'
import { FoldersModule } from '../folders/folders.module'
import { OrmModule } from '../orm/orm.module'
import { ServerModule } from '../server/server.module'
import { UsersModule } from '../users/users.module'
import { ZodSerializerInterceptor } from './serializer/serializer.util'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
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
    QueueModule,
    BullModule.forRootAsync({
      useFactory: (_redisConfig: ConfigType<typeof redisConfig>) => ({
        connection: {
          host: _redisConfig.host,
          port: _redisConfig.port,
        },
      }),
      inject: [redisConfig.KEY],
      imports: [ConfigModule.forFeature(redisConfig)],
    }),
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }],
  controllers: [],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CoreModule {}
