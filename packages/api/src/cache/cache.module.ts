import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'

import { redisConfig } from './redis.config'
import { RedisService } from './redis.service'

@Global()
@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  controllers: [],
  providers: [RedisService],
  exports: [RedisService],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class CacheModule {}
