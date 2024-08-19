import { forwardRef, Inject, Injectable } from '@nestjs/common'
import { BaseProcessor } from 'src/task/base.processor'
import type { CoreTaskInputData } from 'src/task/services/core-task.service'
import { CoreTaskName } from 'src/task/task.constants'

import { FolderService } from '../services/folder.service'

@Injectable()
export class RescanFolderProcessor<
  T extends CoreTaskName.RescanFolder,
  K extends CoreTaskInputData<T>,
> extends BaseProcessor<CoreTaskName.RescanFolder> {
  private readonly folderService: FolderService
  constructor(@Inject(forwardRef(() => FolderService)) _folderService) {
    super(CoreTaskName.RescanFolder)
    this.folderService = _folderService
  }

  async run(data: K) {
    await this.folderService.rescanFolder(data)
  }
}
