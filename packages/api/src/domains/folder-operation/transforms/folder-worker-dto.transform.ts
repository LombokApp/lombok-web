import type { FolderWorker } from '../entities/folder-worker.entity'
import type { FolderWorkerData } from '../transfer-objects/folder-worker.dto'

export const transformFolderWorkerToFolderWorkerDTO = (
  worker: FolderWorker,
): FolderWorkerData => ({
  id: worker.id,
  paused: worker.paused,
  ips: worker.ips,
  capabilities: worker.capabilities,
  firstSeen: worker.firstSeen,
  lastSeen: worker.lastSeen,
  createdAt: worker.createdAt,
  updatedAt: worker.updatedAt,
})
