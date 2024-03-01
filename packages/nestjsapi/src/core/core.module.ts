import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { authConfig } from 'src/auth/config'
import { CacheModule } from 'src/cache/cache.module'
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
  ],
  controllers: [],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CoreModule {}
