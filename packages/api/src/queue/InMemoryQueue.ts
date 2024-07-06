import type { JobsOptions, QueueBase, RedisClient } from 'bullmq'
import { Job } from 'bullmq'
import { v4 as uuidV4 } from 'uuid'

import type { IQueue } from './queue.interface'
import type { QueueService } from './queue.service'

export class InMemoryQueue implements IQueue {
  public queueId = uuidV4()
  public stats = {
    startedJobs: 0,
    failedJobs: 0,
    successfulJobs: 0,
  }
  constructor(
    private readonly queueName: string,
    private readonly queueService: QueueService,
  ) {}

  async add(_: string, data: any, options: JobsOptions | undefined) {
    // console.log(
    //   'Job submitted to InMemoryQueue:',
    //   this.queueName,
    //   '\n',
    //   data,
    //   options,
    // )
    this.stats.startedJobs += 1
    try {
      await this._process(data, options)
      this.stats.successfulJobs += 1
    } catch (e: any) {
      console.log('Error in InMemoryQueue._process:', e?.name || e?.message)
      this.stats.failedJobs += 1
    } finally {
      // console.log('Finished job:', {
      //   options,
      //   data,
      //   stats: this.stats,
      //   queueId: this.queueId,
      // })
    }
  }

  private async _process(data: any, options: JobsOptions | undefined) {
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
        this.queueName,
        data,
        options,
      ),
    )
  }

  async close() {
    // closing
  }
}
