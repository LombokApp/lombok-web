export interface FolderWorkerData {
  id: string
  paused: boolean
  ips: {
    [key: string]: { firstSeen: Date; lastSeen: Date }
  }
  capabilities: string[] | null
  firstSeen: Date | null
  lastSeen: Date | null
  createdAt: Date
  updatedAt: Date
}
