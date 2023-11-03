import { Lifecycle, scoped } from 'tsyringe'

import type { QueueName } from '../../../constants/app-worker-constants'
import type { QueueProcessorFunc } from '../../../util/queue.util'
import { QueueProcessor } from '../../../util/queue.util'
import { FolderOperationService } from '../services/folder-operation.service'

@scoped(Lifecycle.ContainerScoped)
export class ExecuteUnstartedWorkProcessor extends QueueProcessor<QueueName.ExecuteUnstartedWork> {
  constructor(private readonly folderOperationService: FolderOperationService) {
    super()
  }

  run: QueueProcessorFunc<QueueName.ExecuteUnstartedWork> = (_job) => {
    return this.folderOperationService.executeUnstartedWork()
  }
}
