import * as Sentry from '@sentry/node'
import { QueueScheduler, Worker } from 'bullmq'
import { container } from 'tsyringe'

import type { QueueName } from '../constants/queue.constants'
import { OrmService } from '../orm/orm.service'
import type { QueueProcessor } from '../util/queue.util'
import { createProcessor } from '../util/queue.util'
import { RedisService } from './redis.service'

export const workerServiceFactory = <_D, _R, N extends string = string>(
  queue: QueueName,
  processorFunc: new (...args: any[]) => QueueProcessor<N>,
) => {
  const redisService: RedisService = container.resolve(RedisService)
  const ormService: OrmService = container.resolve(OrmService)

  const worker = new Worker(
    queue,
    (job) =>
      ormService.runInAsyncContextFp(createProcessor(processorFunc as any), [
        job,
      ]),
    {
      runRetryDelay: 2000,
      connection: redisService.getConnection(`worker-${queue}`),
    },
  )

  worker.on('error', (error) => {
    Sentry.captureException(error)
  })

  const scheduler = new QueueScheduler(queue, {
    connection: redisService.getConnection(`scheduler-${queue}`),
  })

  scheduler.on('failed', (jobId: string, error: Error) => {
    Sentry.captureException(error)
  })

  return {
    close: async () => {
      await worker.close()
      await worker.disconnect()
      await scheduler.close()
      await scheduler.disconnect()
    },
  }
}
