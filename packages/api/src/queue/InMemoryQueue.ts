import type { JobsOptions, QueueBase, RedisClient } from 'bullmq'
import { Job } from 'bullmq'

import type { IQueue } from './queue.interface'
import type { QueueService } from './queue.service'

export class InMemoryQueue implements IQueue {
  constructor(
    private readonly queueName: string,
    private readonly queueService: QueueService,
  ) {}

  async add(...args: [string, any, JobsOptions | undefined]) {
    // console.log('Job submitted to InMemoryQueue:', this.queueName, '\n', args)
    const [_queueName, data, options] = args
    await this.queueService.processors[this.queueName].process.call(
      this.queueService.processors[this.queueName],
      new Job(
        {
          name: this.queueName,
          opts: {
            connection: {},
            prefix: '',
          },
          keys: {},
          redisVersion: '',
          client: {} as Promise<RedisClient>,
          closing: undefined,
          toKey: () => '',
          emit: () => true,
          on: () => ({}) as QueueBase,
          qualifiedName: '',
          waitUntilReady: undefined as unknown as () => Promise<RedisClient>,
          removeListener: () => ({}) as QueueBase,
        },
        _queueName,
        data,
        options,
      ),
    )
  }

  async close() {
    // closing
  }
}
