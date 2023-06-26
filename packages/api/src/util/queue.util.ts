import type { Job } from 'bullmq'

import { resolveDependency } from '../ioc'

export type QueueProcessor<N extends string> = {
  [K in N]: (job: Job<any, any, K>) => any
}

export const createProcessor = <
  N extends string,
  P extends new (...args: any[]) => QueueProcessor<N>,
>(
  ProcessorConstructor: P,
) => {
  return (job: Job<any, any, N> | undefined) => {
    if (!job) {
      throw new Error('Job undefined!')
    }
    const resolved = resolveDependency(ProcessorConstructor)
    if (!(job.name in resolved)) {
      throw Error(
        `${ProcessorConstructor.name} missing job function '${job.name}'`,
      )
    }
    return resolved[job.name](job)
  }
}
