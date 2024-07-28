import { BullModule, getQueueToken } from '@nestjs/bullmq'
import type { DynamicModule, OnModuleDestroy, Provider } from '@nestjs/common'
import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { redisConfig } from 'src/cache/redis.config'
import { QueueName } from 'src/queue/queue.constants'

import { InMemoryQueue } from './InMemoryQueue'
import { QueueService } from './queue.service'

const _inMemoryQueues: { [key: string]: InMemoryQueue | undefined } = {}

const getOrCreateQueue = (queueName: string, queueService: QueueService) => {
  if (!_inMemoryQueues[queueName]) {
    _inMemoryQueues[queueName] = new InMemoryQueue(queueName, queueService)
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  return _inMemoryQueues[queueName]!
}

const registerQueues = (): {
  [key: string]: DynamicModule | undefined
} =>
  Object.keys(QueueName).reduce<{ [key: string]: DynamicModule }>(
    (acc, queueName) => {
      // eslint-disable-next-line @typescript-eslint/no-extraneous-class
      class InlineQueueModule {}

      const module: DynamicModule = redisConfig().enabled
        ? BullModule.registerQueue({
            name: queueName,
          })
        : {
            providers: [
              {
                provide: getQueueToken(queueName),
                useFactory: (queueService: QueueService) =>
                  getOrCreateQueue(queueName, queueService),
                inject: [QueueService],
              },
            ],
            imports: [],
            module: InlineQueueModule,
            exports: [],
          }

      return {
        ...acc,
        [queueName]: module,
      }
    },
    {},
  )

const registeredQueues = registerQueues()

@Global()
@Module({
  imports: [
    ConfigModule.forFeature(redisConfig),
    ...Object.keys(registeredQueues).map(
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      (queueName) => registeredQueues[queueName]!,
    ),
  ],
  providers: [
    ...Object.keys(QueueName).reduce<Provider[]>(
      (acc, queueName) =>
        acc.concat(registeredQueues[queueName]?.providers ?? []),
      [],
    ),
    QueueService,
  ],
  exports: [
    QueueService,
    ...Object.keys(QueueName).map((queueName) => getQueueToken(queueName)),
  ],
})
export class QueueModule implements OnModuleDestroy {
  constructor(private readonly queueService: QueueService) {}
  async onModuleDestroy() {
    await this.queueService.closeQueues()
  }
}
