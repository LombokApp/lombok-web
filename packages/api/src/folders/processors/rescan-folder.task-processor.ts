import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { BaseProcessor } from 'src/task/base.processor'
import type { CoreTaskInputData } from 'src/task/services/core-task.service'
import { CoreTaskName } from 'src/task/task.constants'

import { FolderService } from '../services/folder.service'

@Injectable()
export class RescanFolderProcessor<
  T extends CoreTaskName.RESCAN_FOLDER,
  K extends CoreTaskInputData<T>,
> extends BaseProcessor<CoreTaskName.RESCAN_FOLDER> {
  private readonly folderService: FolderService
  constructor(@Inject(forwardRef(() => FolderService)) _folderService) {
    super(CoreTaskName.RESCAN_FOLDER)
    this.folderService = _folderService as FolderService
  }

  async run(data: K) {
    await this.folderService.rescanFolder(data)
  }
}
