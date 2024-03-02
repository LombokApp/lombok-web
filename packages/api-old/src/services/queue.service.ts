import * as Sentry from '@sentry/node'
import { Queue, Worker } from 'bullmq'
import { singleton } from 'tsyringe'

import { EnvConfigProvider } from '../config/env-config.provider'
import type {
  AppWorkerOperationNameDataTypes,
  QueueName,
} from '../constants/app-worker-constants'
import { registerExitHandler } from '../util/process.util'
import type { QueueProcessor } from '../util/queue.util'
import { createProcessor } from '../util/queue.util'

@singleton()
export class QueueService {
  queues: { [key: string]: Queue } = {}

  constructor(private readonly config: EnvConfigProvider) {}

  _setupQueue<
    N extends QueueName,
    D extends AppWorkerOperationNameDataTypes[N],
  >(name: N) {
    this.queues[name] = new Queue<D>(name, {
      connection: {
        host: this.config.getRedisConfig().host,
        port: this.config.getRedisConfig().port,
      },
    })

    this.queues[name].on('error', (error: Error) => {
      Sentry.captureException(error)
      console.error(`"${name}" queue error`, error)
    })

    registerExitHandler(async () => {
      await this.queues[name].close()
      await this.queues[name].disconnect()
    })
  }

  add<
    N extends QueueName,
    D extends { [key: string]: any } | undefined,
    O extends { jobId: string; delay?: number },
  >(...inputs: D extends undefined ? [N, O] : [N, D, O]) {
    if (!(inputs[0] in this.queues)) {
      throw new Error(`Queue '${inputs[0]}' is not initialised.`)
    }
    const options =
      typeof inputs[2] === 'undefined' ? (inputs[1] as D) : inputs[2]
    return this.queues[inputs[0]].add(
      inputs[0],
      typeof inputs[2] === 'undefined' ? undefined : inputs[1],
      options,
    )
  }

  getWaitingCount(queueName: QueueName) {
    return this.queues[queueName].getWaitingCount()
  }

  getActiveCount(queueName: QueueName) {
    return this.queues[queueName].getActiveCount()
  }

  bindQueueProcessor<N extends QueueName>(
    queue: QueueName,
    processorFunc: new (...args: any[]) => QueueProcessor<N>,
  ) {
    this._setupQueue(queue)
    const worker = new Worker<AppWorkerOperationNameDataTypes[N], void, N>(
      queue,
      (job) => createProcessor(processorFunc)(job),
      {
        runRetryDelay: 2000,
        connection: {
          host: this.config.getRedisConfig().host,
          port: this.config.getRedisConfig().port,
        },
      },
    )

    worker.on('error', (error) => {
      Sentry.captureException(error)
    })

    return {
      close: async () => {
        await worker.close()
        await worker.disconnect()
      },
    }
  }
}
