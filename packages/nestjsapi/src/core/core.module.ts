import { Module } from '@nestjs/common'

import { AppModule } from '../app/app.module'
import { AuthModule } from '../auth/auth.module'
import { EventModule } from '../event/event.module'
import { FoldersModule } from '../folders/folders.module'
import { LocationsModule } from '../locations/locations.module'
import { OrmModule } from '../orm/orm.module'
import { ServerModule } from '../server/server.module'
import { UsersModule } from '../users/users.module'
import { AppController } from './core.controller'
import { CoreService } from './core.service'
import { RedisService } from './services/redis.service'
import { S3Service } from './services/s3.service'
import { SocketService } from './services/socket.service'

@Module({
  imports: [
    AuthModule,
    OrmModule,
    FoldersModule,
    EventModule,
    AppModule,
    UsersModule,
    LocationsModule,
    ServerModule,
  ],
  controllers: [AppController],
  providers: [CoreService, RedisService, S3Service, SocketService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CoreModule {}
