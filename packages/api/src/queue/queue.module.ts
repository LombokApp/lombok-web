import { BullModule, getQueueToken } from '@nestjs/bullmq'
import type { OnModuleDestroy } from '@nestjs/common'
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
    ...Object.keys(QueueName).map((queueName) => {
      return {
        provide: getQueueToken(queueName),
        useValue: BullModule.registerQueue({
          name: queueName,
        }),
      }
    }),
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
