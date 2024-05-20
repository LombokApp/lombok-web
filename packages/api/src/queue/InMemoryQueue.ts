import type { IQueue } from './queue.interface'
import type { QueueService } from './queue.service'

export class InMemoryQueue implements IQueue {
  constructor(
    private readonly queueName: string,
    private readonly queueService: QueueService,
  ) {}

  async add(...args: any[]) {
    console.log('Job submitted to InMemoryQueue:', this.queueName, '\n', args)
    await this.queueService.processors[this.queueName].process.call(
      this.queueService.processors[this.queueName],
      args,
    )
  }

  async close() {
    // closing
  }
}
