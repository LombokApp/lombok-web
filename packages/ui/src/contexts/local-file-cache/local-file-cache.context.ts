import React from 'react'

import type { ILocalFileCacheContext } from './local-file-cache.types'

export const LocalFileCacheContext =
  React.createContext<ILocalFileCacheContext>({} as ILocalFileCacheContext)
