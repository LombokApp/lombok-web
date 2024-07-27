import { getQueueToken } from '@nestjs/bullmq'
import { Inject, Injectable } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import type { JobsOptions } from 'bullmq'
import { redisConfig } from 'src/cache/redis.config'
import { getApp } from 'src/core/app-helper'
import type { BaseProcessor } from 'src/core/base-processor'

import { QueueName } from './queue.constants'
import type { IQueue } from './queue.interface'

@Injectable()
export class QueueService {
  queues: { [key: string]: IQueue } = {}
  processors: { [key: string]: BaseProcessor } = {}
  initPromise: Promise<void>

  constructor(
    @Inject(redisConfig.KEY)
    private readonly _redisConfig: nestjsConfig.ConfigType<typeof redisConfig>,
  ) {
    // defer the init so the app can is created first
    this.initPromise = new Promise((resolve) => {
      setTimeout(() => void this.init().then(resolve), 1000)
    })
  }

  async init() {
    const app = await getApp()
    if (!app) {
      console.log('App did not exist when registering processor.')
      return
    }

    const injectedQueues = await Promise.all(
      Object.keys(QueueName).map(async (queueName) => ({
        queue: await app.resolve(getQueueToken(queueName)),
        name: queueName,
      })),
    )
    for (const { name, queue } of injectedQueues) {
      this.queues[name] = queue
    }
  }

  async waitForInit() {
    await this.initPromise
  }

  // TODO: Add job data type constraints here
  async addJob(queueName: QueueName, data: any, opts?: JobsOptions) {
    await this.waitForInit()
    // console.log('addJob:', queueName, this.queues)
    if (queueName in this.queues) {
      const queue = this.queues[queueName]
      if (this._redisConfig.enabled || !opts?.repeat) {
        // it's using bullmq or it's a simple (non repeating) job
        await queue.add(queueName, data, opts)
      } else {
        setInterval(() => {
          void queue.add(queueName, data, opts)
        }, opts.repeat.every)
      }
    } else {
      throw new Error(`Unknown queue job type: "${queueName}"`)
    }
  }

  async closeQueues() {
    await this.waitForInit()
    for (const queueName of Object.keys(this.queues)) {
      await this.queues[queueName].close()
    }
  }

  registerProcessor(queueName: string, processor: BaseProcessor) {
    this.processors[queueName] = processor
  }
}
