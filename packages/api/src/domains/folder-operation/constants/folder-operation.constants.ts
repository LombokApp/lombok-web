import type * as r from 'runtypes'

import { EnumType } from '../../../util/types.util'

export enum FolderOperationSort {
  CreatedAtAsc = 'createdAt-asc',
  CreatedAtDesc = 'createdAt-desc',
  UpdatedAtAsc = 'updatedAt-asc',
  UpdatedAtDesc = 'updatedAt-desc',
}

export enum FolderOperationStatus {
  Pending = 'PENDING',
  Failed = 'FAILED',
  Complete = 'COMPLETE',
}

export const FolderOeprationStatusType: r.Runtype<FolderOperationStatus> =
  EnumType(FolderOperationStatus)
