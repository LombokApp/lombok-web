import { FolderPushMessage } from '@lombokapp/types'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import React from 'react'

import type { PushMessage } from '../../hooks/use-websocket'
import { useWebsocket } from '../../hooks/use-websocket'
import { $api } from '../../services/api'
import { LogLevel } from '../logging'
import type {
  IFolderContext,
  Notification,
  SocketMessageHandler,
} from './folder.types'

const FolderContext = React.createContext<IFolderContext>({} as IFolderContext)

export const FolderContextProvider = ({
  children,
  folderId,
}: {
  children: React.ReactNode
  folderId: string
}) => {
  const folderQuery = $api.useQuery('get', '/api/v1/folders/{folderId}', {
    params: { path: { folderId } },
  })
  const folderMetadataQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/metadata',
    {
      params: { path: { folderId } },
    },
  )
  const { toast } = useToast()

  const messageHandler = React.useCallback(
    (message: PushMessage, _payload: Record<string, unknown>) => {
      if (
        (
          [
            FolderPushMessage.OBJECTS_ADDED,
            FolderPushMessage.OBJECTS_REMOVED,
            FolderPushMessage.OBJECT_ADDED,
            FolderPushMessage.OBJECT_REMOVED,
          ] as PushMessage[]
        ).includes(message)
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
  const showNotification = React.useCallback(
    (notification: Notification) => {
      toast({
        title: notification.title,
        description: notification.message,
      })
    },
    [toast],
  )

  const subscribeToMessages = (handler: SocketMessageHandler) => {
    socket?.onAny(handler)
  }

  const unsubscribeFromMessages = (handler: SocketMessageHandler) => {
    socket?.offAny(handler)
  }

  const deleteFolderObjectMutation = $api.useMutation(
    'delete',
    '/api/v1/folders/{folderId}/objects/{objectKey}',
  )

  const deleteFolderObject = async (objectKey: string): Promise<void> => {
    await deleteFolderObjectMutation.mutateAsync({
      params: { path: { folderId, objectKey } },
    })

    // if (folderMetadataQuery.data) {
    //   // Refresh folder data
    //   await Promise.all([folderQuery.refetch(), folderMetadataQuery.refetch()])
    // }

    showNotification({
      level: LogLevel.INFO,
      title: `Object "${objectKey}" deleted`,
      // message: `Object "${objectKey}" deleted`,
      // thumbnailSrc: file?.dataURL,
    })
  }

  return (
    <FolderContext.Provider
      value={{
        folderId,
        folder: folderQuery.data?.folder,
        folderPermissions: folderQuery.data?.permissions,
        refreshFolder: folderQuery.refetch,
        folderMetadata: folderMetadataQuery.data,
        refreshFolderMetadata: folderMetadataQuery.refetch,
        showNotification,
        socketConnected: socket?.connected ?? false,
        subscribeToMessages,
        unsubscribeFromMessages,
        socket,
        deleteFolderObject,
      }}
    >
      {folderId && children}
    </FolderContext.Provider>
  )
}

export { FolderContext }
