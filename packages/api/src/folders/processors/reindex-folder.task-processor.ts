import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { Event } from 'src/event/entities/event.entity'
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
  async run(task: Task, event: Event) {
    if (!event.subjectFolderId || !event.userId) {
      throw new Error('Missing folder id or user id.')
    }
    await this.folderService.reindexFolder({
      folderId: event.subjectFolderId,
      userId: event.userId,
    })
  }
}
