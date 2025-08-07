import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { BaseProcessor } from 'src/task/base.processor'
import type { PlatformTaskInputData } from 'src/task/services/platform-task.service'
import { PlatformTaskName } from 'src/task/task.constants'

import { FolderService } from '../services/folder.service'

@Injectable()
export class ReindexFolderProcessor<
  T extends PlatformTaskName.REINDEX_FOLDER,
  K extends PlatformTaskInputData<T>,
> extends BaseProcessor<PlatformTaskName.REINDEX_FOLDER> {
  private readonly folderService: FolderService
  constructor(@Inject(forwardRef(() => FolderService)) _folderService) {
    super(PlatformTaskName.REINDEX_FOLDER)
    this.folderService = _folderService as FolderService
  }

  async run(data: K) {
    await this.folderService.reindexFolder(data)
  }
}
