import { BullModule } from '@nestjs/bullmq'
import { Module } from '@nestjs/common'
import type { ConfigType } from '@nestjs/config'
import { ConfigModule } from '@nestjs/config'
import { authConfig } from 'src/auth/config'
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

@Module({
  imports: [
    ConfigModule.forRoot({
      envFilePath: '.env',
    }),
    ConfigModule.forFeature(authConfig),
    ConfigModule.forFeature(redisConfig),
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
  controllers: [],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CoreModule {}
