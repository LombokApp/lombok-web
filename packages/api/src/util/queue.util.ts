import type {
  FolderOperationName,
  FolderOperationNameDataTypes,
  FolderOperationNameReturnTypes,
  QueueProcessor,
} from '@stellariscloud/workers'
import type { Job } from 'bullmq'
import type { InjectionToken } from 'tsyringe'

import { resolveDependency } from '../ioc'

export const createProcessor = <
  N extends FolderOperationName,
  R extends FolderOperationNameReturnTypes[N],
  D extends FolderOperationNameDataTypes[N],
>(
  ProcessorConstructor: InjectionToken<QueueProcessor<N>>,
) => {
  return (job: Job<D, R, N> | undefined) => {
    if (!job) {
      throw new Error('Job undefined!')
    }
    const resolved = resolveDependency(ProcessorConstructor)
    return resolved.run(job)
  }
}
