import * as Sentry from '@sentry/node'
import type {
  FolderOperationName,
  FolderOperationNameDataTypes,
  FolderOperationNameReturnTypes,
  QueueProcessorFunc,
} from '@stellariscloud/workers'
import type { AxiosError } from 'axios'
import { Worker } from 'bullmq'
import { container } from 'tsyringe'

import type { ConfigProvider } from '../config/config.interface'
import { EnvConfigProvider } from '../config/env-config.provider'

export const workerServiceFactory = <N extends FolderOperationName>(
  queue: N,
  processorFunc: QueueProcessorFunc<N>,
) => {
  const configProvider: ConfigProvider = container.resolve(EnvConfigProvider)

  const worker = new Worker<
    FolderOperationNameDataTypes[N],
    FolderOperationNameReturnTypes[N],
    N
  >(
    queue,
    async (job) => {
      await processorFunc(job).catch(async (e) => {
        if (e.name === 'AxiosError' && e.response?.status === 400) {
          const axiosError = e as AxiosError<{ errors: string[] }>
          console.log('Axios ERROR:', axiosError.response?.data)
        } else {
          console.log('ERROR:', e)
          if (job.token) {
            console.log('Marking job as failed')
            await job.moveToFailed(e, job.token)
          }
          throw e
        }
      })
    },
    {
      runRetryDelay: 2000,
      connection: {
        host: configProvider.getRedisConfig().host,
        port: configProvider.getRedisConfig().port,
      },
    },
  )

  worker.on('error', (error) => {
    Sentry.captureException(error)
  })

  return {
    close: async () => {
      await worker.close()
      await worker.disconnect()
    },
  }
}
