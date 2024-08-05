import React from 'react'

import { ServerStorageConfig } from './server-storage-config/server-storage-config.view'
import { ServerAccessKeys } from './server-access-keys/server-access-keys.view'

export function ServerStorageScreen() {
  return (
    <div className="">
      <ServerStorageConfig />
      <ServerAccessKeys />
    </div>
  )
}
