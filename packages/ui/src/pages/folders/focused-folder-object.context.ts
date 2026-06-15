import type { FolderObjectDTO } from '@lombokapp/types'
import React from 'react'

export interface IFocusedFolderObjectContext {
  focusedFolderObject?: FolderObjectDTO
  refetch: () => Promise<void>
}

export const FocusedFolderObjectContext =
  React.createContext<IFocusedFolderObjectContext>(
    {} as IFocusedFolderObjectContext,
  )

export const useFocusedFolderObjectContext = () => {
  return React.useContext(FocusedFolderObjectContext)
}
