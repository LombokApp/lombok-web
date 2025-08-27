import React from 'react'

import { LocalFileCacheContext } from './local-file-cache.context'
import type { ILocalFileCacheContext } from './local-file-cache.types'

export const useLocalFileCacheContext = (): ILocalFileCacheContext =>
  React.useContext(LocalFileCacheContext)
