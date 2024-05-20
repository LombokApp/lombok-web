import { Processor } from '@nestjs/bullmq'
import type { Job } from 'bullmq'
import { BaseProcessor } from 'src/core/base-processor'
import { QueueName } from 'src/queue/queue.constants'

import { FolderService } from '../services/folder.service'

@Processor(QueueName.IndexFolder)
export class IndexFolderProcessor extends BaseProcessor {
  constructor(private readonly folderService: FolderService) {
    super()
  }

  async process(job: Job<{ folderId: string; userId: string }>): Promise<void> {
    await this.folderService.refreshFolder(job.data.folderId, job.data.userId)
  }
}
