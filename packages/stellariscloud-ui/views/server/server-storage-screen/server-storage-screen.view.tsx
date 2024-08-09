import React from 'react'

import { ServerStorageConfig } from './server-storage-config/server-storage-config.view'
import { ServerAccessKeys } from './server-access-keys/server-access-keys.view'
import { PageHeading } from '../../../design-system/page-heading/page-heading'
import clsx from 'clsx'
import { CircleStackIcon } from '@heroicons/react/24/outline'

export function ServerStorageScreen() {
  return (
    <div
      className={clsx(
        'p-4 items-center flex flex-1 flex-col h-full overflow-x-hidden overflow-y-auto',
      )}
    >
      <div className="container flex-1 flex flex-col">
        <PageHeading
          titleIcon={CircleStackIcon}
          title={'Storage'}
          subtitle="Manage configured storage provisions and active access keys on this server."
        />
        <ServerStorageConfig />
        <ServerAccessKeys />
      </div>
    </div>
  )
}
