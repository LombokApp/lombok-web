import { BullModule, getQueueToken } from '@nestjs/bullmq'
import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { redisConfig } from 'src/cache/redis.config'
import { QueueName } from 'src/queue/queue.constants'

const queueProvider = {
  provide: getQueueToken(QueueName.IndexFolder),
  useValue: getQueueToken(QueueName.IndexFolder),
}

@Global()
@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  controllers: [],
  providers: [queueProvider],
  exports: [queueProvider.provide],
})
export class QueueModule {
  onApplicationBootstrap() {
    BullModule.registerQueue({
      name: QueueName.IndexFolder,
    })
  }
}
