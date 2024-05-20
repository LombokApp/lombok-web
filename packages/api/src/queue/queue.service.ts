import { getQueueToken } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import type { JobsOptions } from 'bullmq'
import { getApp } from 'src/core/app-helper'
import type { BaseProcessor } from 'src/core/base-processor'

import { QueueName } from './queue.constants'
import type { IQueue } from './queue.interface'

@Injectable()
export class QueueService {
  queues: { [key: string]: IQueue } = {}
  processors: { [key: string]: BaseProcessor } = {}
  initPromise: Promise<void>

  constructor() {
    // defer the init so the app can is created first
    setTimeout(() => void this.init(), 100)
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
      console.log('Registering queue', name, queue.constructor.name)
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
      console.log('About to call add on queue instance', queue.constructor.name)
      await queue.add(queueName, data, opts)
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
