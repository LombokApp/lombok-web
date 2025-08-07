import type { TaskInputData } from '@stellariscloud/types'
import { getApp } from 'src/shared/app-helper'

import type { PlatformTaskInputData } from './services/platform-task.service'
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
  constructor(private readonly coreTaskName: K) {
    // defer the init so the app is created first
    setTimeout(() => void this.registerProcessor(), 100)
  }

  _run(inputData: TaskInputData) {
    return this.run(inputData as never)
  }

  abstract run(inputData: PlatformTaskInputData<K>): Promise<void>

  async registerProcessor() {
    const app = await getApp()
    if (!app) {
      // eslint-disable-next-line no-console
      console.log('App did not exist when registering processor.')
      return
    }
    const coreTaskService = await app.resolve(PlatformTaskService)
    coreTaskService.registerProcessor(this.coreTaskName, this)
  }
}
