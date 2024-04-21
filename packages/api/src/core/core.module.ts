import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { APP_INTERCEPTOR } from '@nestjs/core'
import { CacheModule } from 'src/cache/cache.module'
import { redisConfig } from 'src/cache/redis.config'
import { QueueModule } from 'src/queue/queue.module'
import { S3Module } from 'src/s3/s3.module'
import { SocketModule } from 'src/socket/socket.module'

import { AppModule } from '../app/app.module'
import { AuthModule } from '../auth/auth.module'
import { EventModule } from '../event/event.module'
import { FoldersModule } from '../folders/folders.module'
import { LocationsModule } from '../locations/locations.module'
import { OrmModule } from '../orm/orm.module'
import { ServerModule } from '../server/server.module'
import { UsersModule } from '../users/users.module'
import { ZodSerializerInterceptor } from './serializer/serializer.util'

@Module({
  imports: [
    nestjsConfig.ConfigModule.forRoot({ isGlobal: true, ignoreEnvFile: true }),
    AuthModule,
    OrmModule,
    FoldersModule,
    EventModule,
    AppModule,
    UsersModule,
    LocationsModule,
    ServerModule,
    CacheModule,
    SocketModule,
    S3Module,
    QueueModule,
    BullModule.forRootAsync({
      useFactory: (
        _redisConfig: nestjsConfig.ConfigType<typeof redisConfig>,
      ) => ({
        connection: {
          host: _redisConfig.host,
          port: _redisConfig.port,
        },
      }),
      inject: [redisConfig.KEY],
      imports: [nestjsConfig.ConfigModule.forFeature(redisConfig)],
    }),
  ],
  providers: [{ provide: APP_INTERCEPTOR, useClass: ZodSerializerInterceptor }],
  controllers: [],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CoreModule {}
