import { Inject, Injectable } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import path from 'path'
import { coreConfig } from 'src/core/config'

@Injectable()
export class CoreAppService {
  workers: Record<string, Worker | undefined> = {}

  constructor(
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
  ) {}

  startCoreModuleThread(appWorkerId: string) {
    const embeddedCoreAppToken = this._coreConfig.embeddedCoreAppToken
    if (!embeddedCoreAppToken) {
      throw new Error('Missing EMBEDDED_CORE_APP_TOKEN env variable.')
    }
    if (
      !this.workers[appWorkerId] &&
      !this._coreConfig.disableEmbeddedCoreAppWorker
    ) {
      // run the core-app-worker.ts script in a worker thread
      const worker = (this.workers[appWorkerId] = new Worker(
        path.join(__dirname, 'core-app-worker'),
        {
          name: appWorkerId,
        },
      ))

      setTimeout(() => {
        // send the config as the first message
        worker.postMessage({
          socketBaseUrl: `http://127.0.0.1:3000`, // TODO FIX
          appToken: embeddedCoreAppToken,
          appWorkerId,
        })
      }, 500)

      // eslint-disable-next-line no-console
      console.log('Embedded core app worker thread started')

      worker.addEventListener('error', (err) => {
        // eslint-disable-next-line no-console
        console.log('Worker thread error:', err)
      })

      worker.addEventListener('exit', (err) => {
        // eslint-disable-next-line no-console
        console.log('Worker thread exit:', err)
      })

      worker.addEventListener('message', (event) => {
        // eslint-disable-next-line no-console
        console.log('Embedded core worker event:', event)
      })
    }
  }
}
