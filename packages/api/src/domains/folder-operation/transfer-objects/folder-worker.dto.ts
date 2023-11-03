export interface FolderWorkerData {
  id: string
  externalId: string
  paused: boolean
  ips: {
    [key: string]: { firstSeen: Date; lastSeen: Date } | undefined
  }
  capabilities: string[]
  firstSeen: Date
  lastSeen: Date
  keyId: string | null
  createdAt: Date
  updatedAt: Date
}
