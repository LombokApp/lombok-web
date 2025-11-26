import type { Event } from 'src/event/entities/event.entity'
import { getApp } from 'src/shared/app-helper'

import type { Task } from './entities/task.entity'
import { PlatformTaskService } from './services/platform-task.service'
import type { PlatformTaskName } from './task.constants'

export class ProcessorError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
  ) {
    super()
  }
}

export abstract class BaseProcessor<K extends PlatformTaskName> {
  constructor(private readonly platformTaskName: K) {
    // defer the init so the app is created first
    setTimeout(() => void this.registerProcessor(), 100)
  }

  _run(task: Task, event: Event) {
    return this.run(task, event)
  }

  abstract run(task: Task, event: Event): Promise<void>

  async registerProcessor() {
    const app = await getApp()
    if (!app) {
      // eslint-disable-next-line no-console
      console.log('App did not exist when registering processor.')
      return
    }
    const platformTaskService = await app.resolve(PlatformTaskService)
    platformTaskService.registerProcessor(this.platformTaskName, this)
  }
}
