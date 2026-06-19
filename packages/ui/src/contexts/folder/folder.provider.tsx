import { useToast } from '@lombokapp/ui-toolkit/hooks'
import React from 'react'

import { $api } from '../../services/api'
import { LogLevel } from '../logging'
import { useLiveQuery, useRealtime, useRealtimeRoom } from '../realtime'
import type { IFolderContext, Notification } from './folder.types'

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
  const { connected } = useRealtime()

  // Join this folder's room (ref-counted, ACL-gated server-side).
  useRealtimeRoom(folderId)

  // Keep folder metadata (object counts → empty-state) fresh as objects change.
  // The object grid patches its own items; this only refreshes aggregate counts.
  useLiveQuery({
    resources: ['folder.object'],
    match: (envelope) =>
      envelope.scope.kind === 'folder' && envelope.scope.folderId === folderId,
    queryKey: [
      'get',
      '/api/v1/folders/{folderId}/metadata',
      { params: { path: { folderId } } },
    ],
    mode: 'invalidate',
  })

  const showNotification = React.useCallback(
    (notification: Notification) => {
      toast({
        title: notification.title,
        description: notification.message,
      })
    },
    [toast],
  )

  const deleteFolderObjectMutation = $api.useMutation(
    'delete',
    '/api/v1/folders/{folderId}/objects/{objectKey}',
  )

  const deleteFolderObject = async (objectKey: string): Promise<void> => {
    await deleteFolderObjectMutation.mutateAsync({
      params: { path: { folderId, objectKey } },
    })

    showNotification({
      level: LogLevel.INFO,
      title: `Object "${objectKey}" deleted`,
    })
  }

  return (
    <FolderContext.Provider
      value={{
        folderId,
        folder: folderQuery.data?.folder,
        folderPermissions: folderQuery.data?.permissions,
        starred: folderQuery.data?.starred,
        refreshFolder: folderQuery.refetch,
        folderMetadata: folderMetadataQuery.data,
        refreshFolderMetadata: folderMetadataQuery.refetch,
        showNotification,
        socketConnected: connected,
        deleteFolderObject,
      }}
    >
      {folderId && children}
    </FolderContext.Provider>
  )
}

export { FolderContext }
