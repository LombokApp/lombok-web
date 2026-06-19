import type {
  FolderGetMetadataResponse,
  FolderGetResponse,
  FolderMetadata,
  ServerError,
} from '@lombokapp/types'
import type { QueryObserverResult } from '@tanstack/react-query'

import type { LogLevel } from '../logging'

export interface Notification {
  level: LogLevel
  title: string
  message?: string
  thumbnailSrc?: string
  id?: string
}

export interface IFolderContext {
  folderId: string
  folder?: FolderGetResponse['folder']
  folderPermissions?: FolderGetResponse['permissions']
  starred?: boolean
  refreshFolder: () => Promise<
    QueryObserverResult<FolderGetResponse, ServerError>
  >
  refreshFolderMetadata: () => Promise<
    QueryObserverResult<FolderGetMetadataResponse, ServerError>
  >
  folderMetadata?: FolderMetadata
  showNotification: (n: Notification) => void
  socketConnected: boolean
  deleteFolderObject: (objectKey: string) => Promise<void>
}
