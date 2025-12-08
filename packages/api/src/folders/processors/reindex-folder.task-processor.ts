import { TaskTrigger } from '@lombokapp/types'
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
  async run(task: Task, trigger: TaskTrigger) {
    if (trigger.kind !== 'event') {
      throw new Error('ReindexFolderProcessor requires event trigger.')
    }

    if (
      !task.targetLocation?.folderId ||
      !task.data.userId ||
      typeof task.data.userId !== 'string'
    ) {
      throw new Error(
        `Missing folder id or calling user id in "${PlatformTaskName.ReindexFolder}" task processing.`,
      )
    }
    await this.folderService.reindexFolder({
      folderId: task.targetLocation.folderId,
      userId: task.data.userId,
    })
  }
}
