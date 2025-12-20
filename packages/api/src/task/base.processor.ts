import type { JsonSerializableObject, TaskInvocation } from '@lombokapp/types'
import { Logger } from '@nestjs/common'
import { getApp } from 'src/shared/app-helper'

import type { Task } from './entities/task.entity'
import { PlatformTaskService } from './services/platform-task.service'
import type { PlatformTaskName } from './task.constants'

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
  protected readonly logger: Logger
  constructor(private readonly platformTaskName: K) {
    this.logger = new Logger(`${platformTaskName}_PlatformTaskProcessor`)
    // defer the init so the app is created first
    setTimeout(() => void this.registerProcessor(), 100)
  }

  async _run(
    task: Task,
  ): Promise<undefined | { result: JsonSerializableObject }> {
    const result = await this.run(task)
    return result
  }

  abstract run<T extends { result: JsonSerializableObject } | undefined>(
    task: Task,
  ): Promise<T>

  abstract run(task: Task, trigger: TaskInvocation): Promise<void>

  async registerProcessor() {
    const app = await getApp()
    if (!app) {
      this.logger.error('App did not exist when registering processor.')
      return
    }
    const platformTaskService = await app.resolve(PlatformTaskService)
    platformTaskService.registerProcessor(this.platformTaskName, this)
  }

  // False if this tasks completion should be handled by the processor itself
  shouldRegisterComplete(): boolean {
    return true
  }
}
