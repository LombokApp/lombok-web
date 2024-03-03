import { BullModule } from '@nestjs/bullmq'
import type { Provider } from '@nestjs/common'
import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { redisConfig } from 'src/cache/redis.config'
import { QueueName } from 'src/queue/queue.constants'

import { QueueService } from './queue.service'

const queueModules = Object.keys(QueueName).map((queueName) => {
  return BullModule.registerQueue({
    name: queueName,
  })
})

@Global()
@Module({
  imports: [ConfigModule.forFeature(redisConfig), ...queueModules],
  controllers: [],
  providers: [
    QueueService,
    ...queueModules.reduce<Provider[]>(
      (acc, next) => acc.concat(next.providers ?? []),
      [],
    ),
  ],
  exports: [QueueService, ...queueModules],
})
// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class QueueModule {}
