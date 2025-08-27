import type {
  FolderGetMetadataResponse,
  FolderGetResponse,
  FolderMetadata,
  FolderPushMessage,
} from '@lombokapp/types'
import type { QueryObserverResult } from '@tanstack/react-query'
import type { Socket } from 'socket.io-client'

import type { LogLevel } from '../logging'

export interface Notification {
  level: LogLevel
  title: string
  message?: string
  thumbnailSrc?: string
  id?: string
}

export type SocketMessageHandler = (
  name: FolderPushMessage,
  msg: Record<string, unknown>,
) => void

export interface IFolderContext {
  folderId: string
  folder?: FolderGetResponse['folder']
  folderPermissions?: FolderGetResponse['permissions']
  refreshFolder: () => Promise<QueryObserverResult<FolderGetResponse>>
  refreshFolderMetadata: () => Promise<
    QueryObserverResult<FolderGetMetadataResponse>
  >
  folderMetadata?: FolderMetadata
  showNotification: (n: Notification) => void
  subscribeToMessages: (handler: SocketMessageHandler) => void
  unsubscribeFromMessages: (handler: SocketMessageHandler) => void
  socketConnected: boolean
  socket: Socket | undefined
  deleteFolderObject: (objectKey: string) => Promise<void>
}
