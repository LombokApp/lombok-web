import { getApp } from 'src/shared/app-helper'

import type { CoreTaskInputData } from './services/core-task.service'
import { CoreTaskService } from './services/core-task.service'
import type { CoreTaskName } from './task.constants'

export class ProcessorError extends Error {
  constructor(
    public readonly code: string,
    public readonly message: string,
  ) {
    super()
  }
}

export abstract class BaseProcessor<K extends CoreTaskName> {
  constructor(private readonly coreTaskName: K) {
    // defer the init so the app is created first
    setTimeout(() => void this.registerProcessor(), 100)
  }

  _run(inputData: { [key: string]: string | number }) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.run(inputData as any)
  }

  abstract run(inputData: CoreTaskInputData<K>): Promise<void>

  async registerProcessor() {
    console.log('Trying to register...')
    const app = await getApp()
    if (!app) {
      console.log('App did not exist when registering processor.')
      return
    }
    const coreTaskService = await app.resolve(CoreTaskService)
    await coreTaskService.registerProcessor(this.coreTaskName, this)
  }
}
