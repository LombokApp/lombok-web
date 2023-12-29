// eslint-disable-next-line @typescript-eslint/no-require-imports
require('@stellariscloud/core-worker')
import path from 'path'
import { singleton } from 'tsyringe'
import { Worker } from 'worker_threads'

import { EnvConfigProvider } from '../config/env-config.provider'

@singleton()
export class CoreModuleService {
  worker?: Worker

  constructor(private readonly config: EnvConfigProvider) {}

  startCoreModuleThread() {
    const embeddedCoreModuleToken =
      this.config.getCoreModuleConfig().embeddedCoreModuleToken
    if (!embeddedCoreModuleToken) {
      throw new Error('Missing EMBEDDED_CORE_MODULE_TOKEN env variable.')
    }
    if (!this.worker) {
      const externalId = 'embedded_core_module_worker__1'
      this.worker = new Worker(
        path.join(__dirname, '..', 'core-module-worker'),
        {
          name: externalId,
          workerData: {
            socketBaseUrl: 'http://127.0.0.1:3001',
            moduleToken: embeddedCoreModuleToken,
            externalId,
          },
        },
      )

      console.log('worker thread executed')

      this.worker.on('error', (err) => {
        console.log('worker thread error:', err)
      })

      this.worker.on('exit', (err) => {
        console.log('worker thread exit:', err)
      })

      this.worker.on('message', (msg) => {
        console.log('worker thread message:', msg)
      })
    }
  }
  async stopCoreModuleThread() {
    if (this.worker) {
      await this.worker.terminate()
      this.worker = undefined
    }
  }
}
