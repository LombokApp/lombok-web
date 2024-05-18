import { BullModule, getQueueToken } from '@nestjs/bullmq'
import type { OnModuleDestroy, Provider } from '@nestjs/common'
import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { redisConfig } from 'src/cache/redis.config'
import { QueueName } from 'src/queue/queue.constants'

import { QueueService } from './queue.service'

@Global()
@Module({
  imports: [ConfigModule.forFeature(redisConfig)],
  controllers: [],
  providers: [
    QueueService,
    ...Object.keys(QueueName).reduce<Provider[]>((acc, queueName) => {
      return acc.concat(
        BullModule.registerQueue({
          name: queueName,
        }).providers ?? [],
      )
    }, []),
  ],
  exports: [
    QueueService,
    ...Object.keys(QueueName).map((queueName) => getQueueToken(queueName)),
  ],
})
export class QueueModule implements OnModuleDestroy {
  constructor(private readonly queueService: QueueService) {}
  onModuleDestroy() {
    // console.log('Executing OnDestroy Hook')
    // await this.queueService.closeQueues()
  }
}
