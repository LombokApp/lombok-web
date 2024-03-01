import type { Job } from 'bullmq'
import type { InjectionToken } from 'tsyringe'

import type {
  AppWorkerOperationNameDataTypes,
  QueueName,
} from '../constants/app-worker-constants'
import { resolveDependency } from '../ioc'

export const createProcessor = <
  N extends QueueName,
  D extends AppWorkerOperationNameDataTypes[N],
>(
  ProcessorConstructor: InjectionToken<QueueProcessor<N>>,
) => {
  return (job: Job<D, void, N> | undefined) => {
    if (!job) {
      throw new Error('Job undefined!')
    }
    const resolved = resolveDependency(ProcessorConstructor)
    return resolved.run(job)
  }
}

export type QueueProcessorFunc<N extends QueueName> = (
  job: Job<AppWorkerOperationNameDataTypes[N], void, N>,
) => Promise<void>

export abstract class QueueProcessor<N extends QueueName> {
  abstract run: QueueProcessorFunc<N>
}
