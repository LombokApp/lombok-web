import { forwardRef, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { redisConfig } from 'src/cache/redis.config'
import { EventModule } from 'src/event/event.module'
import { FoldersModule } from 'src/folders/folders.module'
import { S3Module } from 'src/s3/s3.module'
import { S3Service } from 'src/s3/s3.service'

import { AppService } from './services/app.service'

@Module({
  imports: [
    ConfigModule.forFeature(redisConfig),
    EventModule,
    S3Module,
    forwardRef(() => FoldersModule),
  ],
  providers: [AppService, S3Service],
  exports: [AppService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class AppModule {}
