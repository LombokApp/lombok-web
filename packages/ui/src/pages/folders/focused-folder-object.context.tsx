import type { FolderObjectDTO } from '@lombokapp/types'
import React from 'react'

import { $api } from '@/src/services/api'

export interface IFocusedFolderObjectContext {
  focusedFolderObject?: FolderObjectDTO
  refetch: () => Promise<void>
}

export const FocusedFolderObjectContext =
  React.createContext<IFocusedFolderObjectContext>(
    {} as IFocusedFolderObjectContext,
  )

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

export const useFocusedFolderObjectContext = () => {
  return React.useContext(FocusedFolderObjectContext)
}
