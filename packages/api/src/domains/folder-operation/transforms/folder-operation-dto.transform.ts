import type { FolderOperationName } from '@stellariscloud/workers'

import type { FolderOperation } from '../entities/folder-operation.entity'
import type { FolderOperationData } from '../transfer-objects/folder-operation.dto'

export const transformFolderOperationToFolderOperationDTO = (
  folderOperation: FolderOperation,
): FolderOperationData => ({
  id: folderOperation.id,
  started: folderOperation.started,
  completed: folderOperation.completed,
  error: folderOperation.error,
  operationData: folderOperation.operationData,
  operationName: folderOperation.operationName as FolderOperationName,
  createdAt: folderOperation.createdAt,
  updatedAt: folderOperation.updatedAt,
})
