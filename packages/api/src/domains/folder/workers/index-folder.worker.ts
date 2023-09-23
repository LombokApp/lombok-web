import type {
  FolderOperationName,
  QueueProcessorFunc,
} from '@stellariscloud/workers'
import { QueueProcessor } from '@stellariscloud/workers'
import { Lifecycle, scoped } from 'tsyringe'

import { FolderService } from '../services/folder.service'

@scoped(Lifecycle.ContainerScoped)
export class IndexFolderProcessor extends QueueProcessor<FolderOperationName.IndexFolder> {
  constructor(private readonly folderService: FolderService) {
    super()
  }

  run: QueueProcessorFunc<FolderOperationName.IndexFolder> = (job) => {
    return this.folderService.refreshFolder(job.data.folderId, job.data.userId)
  }
}
