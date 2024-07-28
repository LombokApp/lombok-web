import { WorkerHost } from '@nestjs/bullmq'
import { QueueService } from 'src/queue/queue.service'

import { getApp } from './app-helper'

export const PROCESSOR_METADATA = 'bullmq:processor_metadata'

export abstract class BaseProcessor extends WorkerHost {
  constructor() {
    super()
    // defer the init so the app can is created first
    setTimeout(() => void this.registerProcessor(), 100)
  }
  async registerProcessor() {
    const app = await getApp()
    if (!app) {
      console.log('App did not exist when registering processor.')
      return
    }
    const queueService = await app.resolve(QueueService)
    const options = Reflect.getMetadata(PROCESSOR_METADATA, this.constructor)
    queueService.registerProcessor(options.name as string, this)
  }
}
