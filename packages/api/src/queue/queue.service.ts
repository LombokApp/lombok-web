import { getQueueToken } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import type { JobsOptions } from 'bullmq'
import type { BaseProcessor } from 'src/core/base-processor'
import { getApp } from 'src/main'

import { QueueName } from './queue.constants'
import type { IQueue } from './queue.interface'

@Injectable()
export class QueueService {
  queues: { [key: string]: IQueue } = {}
  processors: { [key: string]: BaseProcessor } = {}
  initialized: boolean = false
  initPromise: Promise<void>

  constructor() {
    this.initPromise = getApp().then(async (app) => {
      const injectedQueues = await Promise.all(
        Object.keys(QueueName).map(async (queueName) => ({
          queue: await app.resolve(getQueueToken(queueName)),
          name: queueName,
        })),
      )
      for (const { name, queue } of injectedQueues) {
        console.log('Registering queue', name, queue.constructor.name)
        this.queues[name] = queue
      }
      this.initialized = true
    })
  }
  async waitForInit() {
    if (!this.initialized) {
      await this.initPromise
    }
  }

  // TODO: Add job data type constraints here
  async addJob(queueName: QueueName, data: any, opts?: JobsOptions) {
    await this.waitForInit()
    // console.log('addJob:', queueName, this.queues)
    if (queueName in this.queues) {
      const queue = this.queues[queueName]
      console.log('About to call add on queue instance', queue.constructor.name)
      await queue.add(queueName, data, opts)
    }
  }

  async closeQueues() {
    for (const queueName in this.queues) {
      await this.queues[queueName].close()
    }
  }

  registerProcessor(queueName: string, processor: BaseProcessor) {
    this.processors[queueName] = processor
  }
}
