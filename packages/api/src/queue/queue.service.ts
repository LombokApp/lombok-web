import { InjectQueue } from '@nestjs/bullmq'
import { Injectable } from '@nestjs/common'
import type { JobsOptions } from 'bullmq'
import { Queue } from 'bullmq'

import { QueueName } from './queue.constants'

@Injectable()
export class QueueService {
  queues: { [key: string]: Queue } = {}
  constructor(
    @InjectQueue(QueueName.NotifyAppOfPendingEvents)
    private readonly notifyPendingEventsQueue: Queue<
      { appId: string; eventKey: string; eventCount: number },
      void,
      QueueName.NotifyAppOfPendingEvents
    >,
    @InjectQueue(QueueName.NotifyAllAppsOfPendingEvents)
    private readonly notifyAllAppsOfPendingEventsQueue: Queue<
      undefined,
      void,
      QueueName.NotifyAllAppsOfPendingEvents
    >,
    @InjectQueue(QueueName.IndexFolder)
    private readonly indexFolderQueue: Queue<
      { userId: string; folderId: string },
      void,
      QueueName.IndexFolder
    >,
  ) {
    this.queues[QueueName.NotifyAppOfPendingEvents] =
      this.notifyPendingEventsQueue
    this.queues[QueueName.NotifyAllAppsOfPendingEvents] =
      this.notifyAllAppsOfPendingEventsQueue
    this.queues[QueueName.IndexFolder] = this.indexFolderQueue
  }

  // TODO: Add job data type constraints here
  async addJob(queueName: QueueName, data: any, opts?: JobsOptions) {
    if (queueName in this.queues) {
      return this.queues[queueName].add(queueName, data, opts)
    }
  }
}
