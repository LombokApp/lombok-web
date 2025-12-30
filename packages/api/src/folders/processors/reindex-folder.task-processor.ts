import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { BaseProcessor } from 'src/task/base.processor'
import { Task } from 'src/task/entities/task.entity'
import { PlatformTaskName } from 'src/task/task.constants'

import { FolderService } from '../services/folder.service'

@Injectable()
export class ReindexFolderProcessor extends BaseProcessor<PlatformTaskName.ReindexFolder> {
  private readonly folderService: FolderService
  constructor(@Inject(forwardRef(() => FolderService)) _folderService) {
    super(PlatformTaskName.ReindexFolder)
    this.folderService = _folderService as FolderService
  }
  async run(task: Task) {
    const userId =
      task.trigger.kind === 'user_action'
        ? task.trigger.invokeContext.userId
        : undefined
    if (!task.targetLocationFolderId || !userId) {
      throw new Error(
        `Missing folder id or calling user id in "${PlatformTaskName.ReindexFolder}" task processing.`,
      )
    }
    await this.folderService.reindexFolder({
      folderId: task.targetLocationFolderId,
    })
  }
}
