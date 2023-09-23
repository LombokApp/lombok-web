import type {
  FolderAndPermission,
  FolderOperationData,
  FolderShareData,
  ObjectTagData,
} from '@stellariscloud/api-client'
import type { FolderMetadata } from '@stellariscloud/types'
import { FolderPushMessage } from '@stellariscloud/types'
import React from 'react'
import type { Socket } from 'socket.io-client'

import { useFolderWebsocket } from '../hooks/use-folder-websocket'
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
  subscribeToMessages: (handler: SocketMessageHandler) => void
  unsubscribeFromMessages: (handler: SocketMessageHandler) => void
  socketConnected: boolean
  socket: Socket | undefined
}

export type SocketMessageHandler = (
  name: FolderPushMessage,
  msg: { [key: string]: any },
) => void

export const FolderContext = React.createContext<IFolderContext>(
  {} as IFolderContext,
)

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
  const [_folderOperations, setFolderOperations] =
    React.useState<FolderOperationData[]>()

  const fetchFolder = React.useCallback(
    () =>
      foldersApi
        .getFolder({ folderId })
        .then((response) => setFolderAndPermission(response.data)),
    [folderId],
  )

  const fetchFolderMetadata = React.useCallback(
    async () =>
      foldersApi
        .getFolderMetadata({ folderId })
        .then((response) => setFolderMetadata(response.data)),
    [folderId],
  )

  const messageHandler = React.useCallback(
    (message: { name: FolderPushMessage; payload: { [key: string]: any } }) => {
      if (
        [
          FolderPushMessage.OBJECTS_ADDED,
          FolderPushMessage.OBJECTS_REMOVED,
          FolderPushMessage.OBJECT_ADDED,
          FolderPushMessage.OBJECT_REMOVED,
        ].includes(message.name)
      ) {
        void fetchFolder()
        void fetchFolderMetadata()
      } else if (FolderPushMessage.OBJECT_UPDATED === message.name) {
        // const folderObject = message.payload as FolderObjectData
        // const previewSize = 'small'
        // void (
        //   folderObject.contentMetadata.previews &&
        //   previewSize in folderObject.contentMetadata.previews
        //     ? getData(
        //         folderObject.folder.id,
        //         `${folderObject.objectKey}____previews/${folderObject.contentMetadata.previews[previewSize]?.path}`,
        //       )
        //     : Promise.resolve(undefined)
        // ).then((file) => {
        //   folderContext.showNotification({
        //     level: LogLevel.INFO,
        //     message: `Object "${folderObject.objectKey}" updated`,
        //     thumbnailSrc: file?.dataURL,
        //   })
        // })
        // if (folderObject.objectKey in folderObjects.current.positions) {
        //   const position =
        //     folderObjects.current.positions[folderObject.objectKey]
        //   folderObjects.current.results[position] = folderObject
        //   renderFolderObjectPreview(
        //     (f, o) => handleObjectLinkClick(f, o, position),
        //     (f, o) => ({ filePromise: getData(f, o) }),
        //     position,
        //     folderObject,
        //     true,
        //   )
        // }
      }
    },
    [fetchFolder, fetchFolderMetadata],
  )
  const { socket, connected: socketConnected } = useFolderWebsocket(
    folderId,
    messageHandler,
  )

  const fetchFolderTags = React.useCallback(
    () =>
      foldersApi
        .listTags({ folderId })
        .then((response) => setObjectTags(response.data.result)),
    [folderId],
  )

  const _fetchFolderOperations = React.useCallback(
    () =>
      foldersApi
        .listFolderOperations({ folderId })
        .then((response) => setFolderOperations(response.data.result)),
    [folderId],
  )

  const createFolderTag = (tagName: string) => {
    return foldersApi
      .createTag({ folderId, createTagRequest: { name: tagName } })
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

  React.useEffect(() => {
    if (folderId) {
      void fetchFolder()
      void fetchFolderMetadata()
      void fetchFolderTags()
    }
  }, [folderId, fetchFolder, fetchFolderTags, fetchFolderMetadata])

  const subscribeToMessages = (handler: SocketMessageHandler) => {
    socket?.onAny(handler)
  }

  const unsubscribeFromMessages = (handler: SocketMessageHandler) => {
    socket?.offAny(handler)
  }

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
        socketConnected,
        subscribeToMessages,
        unsubscribeFromMessages,
        socket,
      }}
    >
      {folderId && children}
    </FolderContext.Provider>
  )
}

export const useFolderContext = (messageHandler?: SocketMessageHandler) => {
  const context = React.useContext(FolderContext)
  const { subscribeToMessages, unsubscribeFromMessages } = context
  React.useEffect(() => {
    if (messageHandler) {
      subscribeToMessages(messageHandler)
    }

    return () => {
      if (messageHandler) {
        unsubscribeFromMessages(messageHandler)
      }
    }
  }, [messageHandler, subscribeToMessages, unsubscribeFromMessages])

  return context
}
