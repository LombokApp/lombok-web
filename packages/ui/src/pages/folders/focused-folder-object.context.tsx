import type { FolderObjectDTO } from '@stellariscloud/api-client'
import React from 'react'

import { foldersApiHooks } from '../../services/api'

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
  const fetchFolderObject = foldersApiHooks.useGetFolderObject({
    folderId,
    objectKey: focusedFolderObjectKey,
  })

  const handleRefetch = React.useCallback(async () => {
    await fetchFolderObject.refetch()
  }, [fetchFolderObject])

  return (
    <FocusedFolderObjectContext.Provider
      value={{
        focusedFolderObject: fetchFolderObject.data?.folderObject,
        refetch: handleRefetch,
      }}
    >
      {children}
    </FocusedFolderObjectContext.Provider>
  )
}

export const useFocusedFolderObjectContext = () => {
  return React.useContext(FocusedFolderObjectContext)
}
