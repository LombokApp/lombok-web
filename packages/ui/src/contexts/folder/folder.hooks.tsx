import React from 'react'

import { FolderContext } from './folder.provider'

export const useFolderContext = () => React.useContext(FolderContext)
