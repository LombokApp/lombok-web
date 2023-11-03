import type { FolderWorker } from '../entities/folder-worker.entity'
import type { FolderWorkerData } from '../transfer-objects/folder-worker.dto'

export const transformFolderWorkerToFolderWorkerDTO = (
  worker: FolderWorker,
): FolderWorkerData => ({
  id: worker.id,
  externalId: worker.externalId,
  paused: worker.paused,
  ips: worker.ips,
  capabilities: worker.capabilities,
  firstSeen: worker.firstSeen,
  lastSeen: worker.lastSeen,
  keyId: worker.keyId,
  createdAt: worker.createdAt,
  updatedAt: worker.updatedAt,
})
