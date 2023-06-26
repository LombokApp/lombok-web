import type {
  FolderAndPermission,
  FolderShareData,
  ObjectTagData,
} from '@stellariscloud/api-client'
import type { FolderMetadata } from '@stellariscloud/types'
import React from 'react'

import { foldersApi } from '../services/api'
import { useLocalFileCacheContext } from './local-file-cache.context'
import type { LogLevel } from './logging.context'

export interface IFolderContext {
  folderId: string
  folder?: FolderAndPermission['folder']
  folderPermissions?: FolderAndPermission['permissions']
  refreshFolder: () => Promise<void>
  refreshTags: () => Promise<void>
  tags?: ObjectTagData[]
  createObjectTag: (tag: string) => Promise<ObjectTagData>
  refreshFolderMetadata: () => Promise<void>
  folderMetadata?: FolderMetadata
  refreshFolderShares: () => Promise<void>
  folderShares?: FolderShareData[]
  notifications: Notification[]
  showNotification: (n: Notification) => void
  newNotificationFlag?: string
}

const FolderContext = React.createContext<IFolderContext>({} as IFolderContext)

export interface Notification {
  level: LogLevel
  message: string
  thumbnailSrc?: string
  id?: string
}

export const FolderContextProvider = ({
  children,
  folderId,
}: {
  children: React.ReactNode
  folderId: string
}) => {
  const _localFileCacheContext = useLocalFileCacheContext()
  //   const loggingContext = useLoggingContext()

  const [folderAndPermission, setFolderAndPermission] =
    React.useState<FolderAndPermission>()
  const [folderMetadata, setFolderMetadata] = React.useState<FolderMetadata>()
  const [objectTags, setObjectTags] = React.useState<ObjectTagData[]>()
  const [folderShares, setFolderShares] = React.useState<FolderShareData[]>()
  const notifications = React.useRef<Notification[]>([])
  const [newNotificationFlag, setNewNotificationFlag] = React.useState<string>()

  const fetchFolderTags = React.useCallback(
    () =>
      foldersApi
        .listTags({ folderId })
        .then((response) => setObjectTags(response.data.result)),
    [folderId],
  )

  const fetchFolderMetadata = React.useCallback(
    async () =>
      foldersApi
        .getFolderMetadata({ folderId })
        .then((response) => setFolderMetadata(response.data)),
    [folderId],
  )

  const createFolderTag = (tagName: string) => {
    return foldersApi
      .createTag({ folderId, inlineObject2: { name: tagName } })
      .then((response) => {
        void fetchFolderTags()
        return response.data
      })
  }

  const showNotification = React.useCallback((notification: Notification) => {
    const randomId = (Math.random() + 1).toString(36).substring(7)
    notifications.current.unshift({ ...notification, id: randomId })
    if (notifications.current.length > 100) {
      notifications.current.pop()
    }
    notifications.current = [...notifications.current]
    setNewNotificationFlag(randomId)
    setTimeout(() => {
      setNewNotificationFlag((notificationFlag) =>
        notificationFlag === randomId ? undefined : notificationFlag,
      )
    }, 2500)
    setTimeout(() => {
      const index = notifications.current.findIndex((n) => n.id === randomId)
      notifications.current.splice(index, 1)
      notifications.current = [...notifications.current]
    }, 5000)
  }, [])

  const fetchFolderShares = React.useCallback(
    () =>
      foldersApi
        .listFolderShares({ folderId })
        .then((response) => setFolderShares(response.data.result)),
    [folderId],
  )

  const fetchFolder = React.useCallback(
    () =>
      foldersApi
        .getFolder({ folderId })
        .then((response) => setFolderAndPermission(response.data)),
    [folderId],
  )

  React.useEffect(() => {
    if (folderId) {
      void fetchFolder()
      void fetchFolderMetadata()
      void fetchFolderTags()
    }
  }, [folderId, fetchFolder, fetchFolderTags, fetchFolderMetadata])

  return (
    <FolderContext.Provider
      value={{
        newNotificationFlag,
        folderId,
        folder: folderAndPermission?.folder,
        folderPermissions: folderAndPermission?.permissions,
        refreshFolder: fetchFolder,
        folderMetadata,
        refreshFolderMetadata: fetchFolderMetadata,
        tags: objectTags,
        refreshTags: fetchFolderTags,
        createObjectTag: createFolderTag,
        folderShares,
        refreshFolderShares: fetchFolderShares,
        notifications: notifications.current,
        showNotification,
      }}
    >
      {folderId && children}
    </FolderContext.Provider>
  )
}

export const useFolderContext = (): IFolderContext =>
  React.useContext(FolderContext)
