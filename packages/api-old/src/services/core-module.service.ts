// eslint-disable-next-line @typescript-eslint/no-require-imports
require('@stellariscloud/core-worker')
import path from 'path'
import { singleton } from 'tsyringe'
import { Worker } from 'worker_threads'

import { EnvConfigProvider } from '../config/env-config.provider'

@singleton()
export class CoreModuleService {
  workers: { [workerKey: string]: Worker | undefined } = {}

  constructor(private readonly config: EnvConfigProvider) {}

  startCoreModuleThread(moduleWorkerId: string) {
    const embeddedCoreModuleToken =
      this.config.getCoreModuleConfig().embeddedCoreModuleToken
    if (!embeddedCoreModuleToken) {
      throw new Error('Missing EMBEDDED_CORE_MODULE_TOKEN env variable.')
    }
    if (!this.workers[moduleWorkerId]) {
      const worker = (this.workers[moduleWorkerId] = new Worker(
        path.join(__dirname, '..', 'core-module-worker'),
        {
          name: moduleWorkerId,
          workerData: {
            socketBaseUrl: 'http://127.0.0.1:3001',
            moduleToken: embeddedCoreModuleToken,
            moduleWorkerId,
          },
        },
      ))

      console.log('worker thread executed')

      worker.on('error', (err) => {
        console.log('worker thread error:', err)
      })

      worker.on('exit', (err) => {
        console.log('worker thread exit:', err)
      })

      worker.on('message', (msg) => {
        console.log('worker thread message:', msg)
      })
    }
  }
}
