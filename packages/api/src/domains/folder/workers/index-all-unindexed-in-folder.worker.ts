import { Lifecycle, scoped } from 'tsyringe'

import type { QueueName } from '../../../constants/app-worker-constants'
import type { QueueProcessorFunc } from '../../../util/queue.util'
import { QueueProcessor } from '../../../util/queue.util'
import { FolderService } from '../services/folder.service'

@scoped(Lifecycle.ContainerScoped)
export class IndexAllUnindexedInFolderProcessor extends QueueProcessor<QueueName.IndexAllUnindexedInFolder> {
  constructor(private readonly folderService: FolderService) {
    super()
  }

  run: QueueProcessorFunc<QueueName.IndexAllUnindexedInFolder> = async (
    job,
  ) => {
    await this.folderService.indexAllUnindexedContentAsUser({
      userId: job.data.userId,
      folderId: job.data.folderId,
    })
  }
}
