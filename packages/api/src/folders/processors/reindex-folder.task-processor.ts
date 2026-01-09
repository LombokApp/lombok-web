import { Injectable } from '@nestjs/common'
import { BaseCoreTaskProcessor } from 'src/task/base.processor'
import { CoreTaskName } from 'src/task/task.constants'

import { FolderService } from '../services/folder.service'

@Injectable()
export class ReindexFolderProcessor extends BaseCoreTaskProcessor<CoreTaskName.ReindexFolder> {
  constructor(private readonly folderService: FolderService) {
    super(CoreTaskName.ReindexFolder, async (task) => {
      const userId =
        task.invocation.kind === 'user_action'
          ? task.invocation.invokeContext.userId
          : undefined
      if (!task.data.folderId || !userId) {
        throw new Error(
          `Missing folder id or calling user id in "${CoreTaskName.ReindexFolder}" task processing.`,
        )
      }
      await this.folderService.reindexFolder({
        folderId: task.data.folderId,
      })
    })
  }
}
