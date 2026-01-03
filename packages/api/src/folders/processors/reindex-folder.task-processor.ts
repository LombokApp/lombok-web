import { Injectable } from '@nestjs/common'
import { BaseProcessor } from 'src/task/base.processor'
import { PlatformTaskName } from 'src/task/task.constants'

import { FolderService } from '../services/folder.service'

@Injectable()
export class ReindexFolderProcessor extends BaseProcessor<PlatformTaskName.ReindexFolder> {
  constructor(private readonly folderService: FolderService) {
    super(PlatformTaskName.ReindexFolder, async (task) => {
      const userId =
        task.trigger.kind === 'user_action'
          ? task.trigger.invokeContext.userId
          : undefined
      if (!task.data.folderId || !userId) {
        throw new Error(
          `Missing folder id or calling user id in "${PlatformTaskName.ReindexFolder}" task processing.`,
        )
      }
      await this.folderService.reindexFolder({
        folderId: task.data.folderId,
      })
    })
  }
}
