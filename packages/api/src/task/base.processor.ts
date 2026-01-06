import { Logger } from '@nestjs/common'
import { getApp } from 'src/shared/app-helper'

import type { JsonSerializableObject } from '../../../types'
import type { Task } from './entities/task.entity'
import { CoreTaskService } from './services/core-task.service'
import type { CoreTaskData, CoreTaskName } from './task.constants'

export type CoreTask<K extends CoreTaskName> = Task<CoreTaskData[K]> & {
  taskIdentifier: K
  handlerType: 'core'
}

export class CoreTaskProcessorError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly details?: JsonSerializableObject,
  ) {
    super()
  }
}

export abstract class BaseCoreTaskProcessor<K extends CoreTaskName> {
  protected constructor(
    private readonly platformTaskName: K,
    public readonly run: (task: CoreTask<K>) => Promise<void>,
    protected readonly logger = new Logger(
      `${this.platformTaskName}_PlatformTaskProcessor`,
    ),
  ) {
    setTimeout(() => void this.registerProcessor(), 100)
  }
  // False if this tasks completion should be handled by the processor itself
  shouldRegisterComplete(): boolean {
    return true
  }

  async registerProcessor() {
    const app = await getApp()
    if (!app) {
      // this.logger.error('App did not exist when registering processor.')
      return
    }
    const platformTaskService = await app.resolve(CoreTaskService)
    platformTaskService.registerProcessor(this.platformTaskName, this)
  }
}
