import type {
  FolderGetMetadataResponse,
  FolderGetResponse,
} from '@stellariscloud/api-client'
import type { FolderMetadata } from '@stellariscloud/types'
import { FolderPushMessage } from '@stellariscloud/types'
import React from 'react'
import type { QueryObserverResult } from 'react-query'
import type { Socket } from 'socket.io-client'

import { useLocalFileCacheContext } from '../../contexts/local-file-cache.context'
import type { LogLevel } from '../../contexts/logging.context'
import { useWebsocket } from '../../hooks/use-websocket'
import { foldersApiHooks } from '../../services/api'

export interface Notification {
  level: LogLevel
  message: string
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
  notifications: Notification[]
  showNotification: (n: Notification) => void
  newNotificationFlag?: string
  subscribeToMessages: (handler: SocketMessageHandler) => void
  unsubscribeFromMessages: (handler: SocketMessageHandler) => void
  socketConnected: boolean
  socket: Socket | undefined
}

const FolderContext = React.createContext<IFolderContext>({} as IFolderContext)

export const FolderContextProvider = ({
  children,
  folderId,
}: {
  children: React.ReactNode
  folderId: string
}) => {
  const _localFileCacheContext = useLocalFileCacheContext()
  //   const loggingContext = useLoggingContext()

  const notifications = React.useRef<Notification[]>([])
  const [newNotificationFlag, setNewNotificationFlag] = React.useState<string>()

  const folderQuery = foldersApiHooks.useGetFolder({ folderId })
  const folderMetadataQuery = foldersApiHooks.useGetFolderMetadata({ folderId })

  const messageHandler = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (message: FolderPushMessage, payload: Record<string, unknown>) => {
      if (
        [
          FolderPushMessage.OBJECTS_ADDED,
          FolderPushMessage.OBJECTS_REMOVED,
          FolderPushMessage.OBJECT_ADDED,
          FolderPushMessage.OBJECT_REMOVED,
        ].includes(message)
      ) {
        void folderQuery.refetch()
        void folderMetadataQuery.refetch()
      } else if (FolderPushMessage.OBJECT_UPDATED === message) {
        void folderQuery.refetch()
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
    [folderQuery, folderMetadataQuery],
  )
  const { socket } = useWebsocket('folder', messageHandler, { folderId })
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
        folder: folderQuery.data?.folder,
        folderPermissions: folderQuery.data?.permissions,
        refreshFolder: folderQuery.refetch,
        folderMetadata: folderMetadataQuery.data,
        refreshFolderMetadata: folderMetadataQuery.refetch,
        notifications: notifications.current,
        showNotification,
        socketConnected: socket?.connected ?? false,
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
