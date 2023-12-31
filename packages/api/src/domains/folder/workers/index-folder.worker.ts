import { singleton } from 'tsyringe'

import type { QueueName } from '../../../constants/app-worker-constants'
import type { QueueProcessorFunc } from '../../../util/queue.util'
import { QueueProcessor } from '../../../util/queue.util'
import { FolderService } from '../services/folder.service'

@singleton()
export class IndexFolderProcessor extends QueueProcessor<QueueName.IndexFolder> {
  constructor(private readonly folderService: FolderService) {
    super()
  }

  run: QueueProcessorFunc<QueueName.IndexFolder> = (job) => {
    return this.folderService.refreshFolder(job.data.folderId, job.data.userId)
  }
}
