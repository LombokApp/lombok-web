import { Processor, WorkerHost } from '@nestjs/bullmq'
import type { Job } from 'bullmq'
import { QueueName } from 'src/queue/queue.constants'

import { FolderService } from '../services/folder.service'

@Processor(QueueName.IndexFolder)
export class IndexFolderProcessor extends WorkerHost {
  constructor(private readonly folderService: FolderService) {
    super()
  }

  async process(job: Job<{ folderId: string; userId: string }>): Promise<void> {
    await this.folderService.refreshFolder(job.data.folderId, job.data.userId)
  }
}
