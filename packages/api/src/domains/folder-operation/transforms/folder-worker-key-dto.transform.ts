import type { FolderWorkerKey } from '../entities/folder-worker-key.entity'
import type { FolderWorkerKeyData } from '../transfer-objects/folder-worker-key.dto'

export const transformFolderWorkerKeyToFolderWorkerKeyDTO = (
  workerKey: FolderWorkerKey,
): FolderWorkerKeyData => ({
  id: workerKey.id,
  accessTokenExpiresAt: workerKey.accessTokenExpiresAt,
  createdAt: workerKey.createdAt,
  updatedAt: workerKey.updatedAt,
})
