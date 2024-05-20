import { WorkerHost } from '@nestjs/bullmq'
import { getApp } from 'src/main'
import { QueueService } from 'src/queue/queue.service'

export const PROCESSOR_METADATA = 'bullmq:processor_metadata'

export abstract class BaseProcessor extends WorkerHost {
  constructor() {
    super()
    void getApp().then(async (app) => {
      const queueService = await app.resolve(QueueService)
      const options = Reflect.getMetadata(PROCESSOR_METADATA, this.constructor)
      queueService.registerProcessor(options.name as string, this)
    })
  }
}
