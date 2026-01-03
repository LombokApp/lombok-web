import { Logger } from '@nestjs/common'
import { getApp } from 'src/shared/app-helper'

import type { JsonSerializableObject } from '../../../types'
import type { Task } from './entities/task.entity'
import { PlatformTaskService } from './services/platform-task.service'
import type {
  PlatformProcessorTaskData,
  PlatformTaskName,
} from './task.constants'

export type PlatformProcessorTask<K extends PlatformTaskName> = Task<
  PlatformProcessorTaskData[K]
> & {
  taskIdentifier: K
}

export class TaskProcessorError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
    public readonly details?: JsonSerializableObject,
  ) {
    super()
  }
}

export abstract class BaseProcessor<K extends PlatformTaskName> {
  protected constructor(
    private readonly platformTaskName: K,
    public readonly run: (task: PlatformProcessorTask<K>) => Promise<void>,
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
    const platformTaskService = await app.resolve(PlatformTaskService)
    platformTaskService.registerProcessor(this.platformTaskName, this)
  }
}
