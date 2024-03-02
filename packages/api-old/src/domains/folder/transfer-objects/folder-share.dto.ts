import type { TimestampData } from '../../../transfer-objects/timestamps.dto'
import type { FolderPermissionName } from '../services/folder.service'

export interface FolderShareConfig {
  permissions: FolderPermissionName[]
}

export interface CreateFolderSharePayload {
  userInviteEmail: string
  shareConfiguration: FolderShareConfig
}

export interface UpdateFolderSharePayload {
  shareConfiguration: FolderShareConfig
}

export interface FolderShareData extends TimestampData {
  id: string
  userId?: string
  userLabel: string
  userInviteEmail: string
  folder: {
    id: string
  }
  shareConfiguration: FolderShareConfig
}
