import React from 'react'

import { ServerStorageConfig } from './server-storage-config/server-storage-config.view'
import { ServerAccessKeys } from './server-access-keys/server-access-keys.view'
import { PageHeading } from '../../../design-system/page-heading/page-heading'
import clsx from 'clsx'

export function ServerStorageScreen() {
  return (
    <div
      className={clsx(
        'p-4 items-center flex flex-1 flex-col gap-6 h-full overflow-y-auto',
      )}
    >
      <PageHeading title={'Server Storage'} />

      <ServerStorageConfig />
      <ServerAccessKeys />
    </div>
  )
}
