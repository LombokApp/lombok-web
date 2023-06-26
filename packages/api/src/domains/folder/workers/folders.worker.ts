import type { Job } from 'bullmq'
import { Lifecycle, scoped } from 'tsyringe'

import type { QueueProcessor } from '../../../util/queue.util'
import type { FoldersJobName } from '../constants/folders.constants'
import { FolderService } from '../services/folder.service'

export type RefreshSingleFolderObjectJob = Job<
  {},
  void,
  FoldersJobName.RefreshSingleFolderObject
>

export type RefreshFolderObjectsJob = Job<
  { folderId: string; userId: string },
  void,
  FoldersJobName.RefreshFolderObjects
>

export type FoldersJob = RefreshFolderObjectsJob | RefreshSingleFolderObjectJob

@scoped(Lifecycle.ContainerScoped)
export class FoldersProcessor implements QueueProcessor<FoldersJobName> {
  constructor(private readonly folderService: FolderService) {}

  async refreshFolderObjects(job: RefreshFolderObjectsJob) {
    await this.folderService.refreshFolder(job.data.folderId, job.data.userId)
  }

  async refreshSingleFolderObject(_job: RefreshSingleFolderObjectJob) {
    // TODO: implement
  }
}
