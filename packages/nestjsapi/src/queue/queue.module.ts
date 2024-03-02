import { BullModule } from '@nestjs/bullmq'
import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { redisConfig } from 'src/cache/redis.config'
import { QueueName } from 'src/queue/queue.constants'

@Global()
@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  controllers: [],
  providers: [],
  exports: [],
})
export class QueueModule {
  onApplicationBootstrap() {
    BullModule.registerQueue({
      name: QueueName.IndexFolder,
    })
  }
}
