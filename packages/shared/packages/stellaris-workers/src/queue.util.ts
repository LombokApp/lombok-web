import type { Job } from 'bullmq'

import type {
  FolderOperationName,
  FolderOperationNameDataTypes,
  FolderOperationNameReturnTypes,
} from './constants/worker-constants'

export type QueueProcessorFunc<N extends FolderOperationName> = (
  job: Job<
    FolderOperationNameDataTypes[N],
    FolderOperationNameReturnTypes[N],
    N
  >,
) => Promise<FolderOperationNameReturnTypes[N]>

export abstract class QueueProcessor<N extends FolderOperationName> {
  abstract run: QueueProcessorFunc<N>
}
