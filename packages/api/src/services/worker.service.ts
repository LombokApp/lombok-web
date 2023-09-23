import * as Sentry from '@sentry/node'
import type {
  FolderOperationName,
  FolderOperationNameDataTypes,
  FolderOperationNameReturnTypes,
  QueueProcessor,
} from '@stellariscloud/workers'
import { Worker } from 'bullmq'
import { container } from 'tsyringe'

import type { ConfigProvider } from '../config/config.interface'
import { EnvConfigProvider } from '../config/env-config.provider'
import { OrmService } from '../orm/orm.service'
import { createProcessor } from '../util/queue.util'

export const workerServiceFactory = <N extends FolderOperationName>(
  queue: FolderOperationName,
  processorFunc: new (...args: any[]) => QueueProcessor<N>,
) => {
  const configProvider: ConfigProvider = container.resolve(EnvConfigProvider)
  const ormService: OrmService = container.resolve(OrmService)

  const worker = new Worker<
    FolderOperationNameDataTypes[N],
    FolderOperationNameReturnTypes[N],
    FolderOperationName
  >(
    queue,
    (job) =>
      ormService.runInAsyncContextFp(createProcessor(processorFunc), [
        job as any,
      ]),
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
