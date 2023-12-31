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

  startCoreModuleThread(externalId: string) {
    const embeddedCoreModuleToken =
      this.config.getCoreModuleConfig().embeddedCoreModuleToken
    if (!embeddedCoreModuleToken) {
      throw new Error('Missing EMBEDDED_CORE_MODULE_TOKEN env variable.')
    }
    if (!this.workers[externalId]) {
      const worker = (this.workers[externalId] = new Worker(
        path.join(__dirname, '..', 'core-module-worker'),
        {
          name: externalId,
          workerData: {
            socketBaseUrl: 'http://127.0.0.1:3001',
            moduleToken: embeddedCoreModuleToken,
            externalId,
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
