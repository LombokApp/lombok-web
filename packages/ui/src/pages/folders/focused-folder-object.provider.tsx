import React from 'react'

import { $api } from '@/src/services/api'

import { FocusedFolderObjectContext } from './focused-folder-object.context'

export const FocusedFolderObjectContextProvider = ({
  children,
  folderId,
  focusedFolderObjectKey,
}: {
  children: React.ReactNode
  folderId: string
  focusedFolderObjectKey: string
}) => {
  const { data: fetchFolderObject, refetch } = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/objects/{objectKey}',
    {
      params: {
        path: {
          folderId,
          objectKey: focusedFolderObjectKey,
        },
      },
    },
  )

  return (
    <FocusedFolderObjectContext.Provider
      value={{
        focusedFolderObject: fetchFolderObject?.folderObject,
        refetch: async () => {
          await refetch()
        },
      }}
    >
      {children}
    </FocusedFolderObjectContext.Provider>
  )
}
