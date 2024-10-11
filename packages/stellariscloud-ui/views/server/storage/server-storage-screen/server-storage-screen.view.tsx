import React from 'react'

import { ServerStorageProvisions } from '../../settings/server-settings-screen/server-storage-provisions/server-storage-provisions.view'
import { ServerAccessKeys } from '../server-access-keys/server-access-keys.view'
import { PageHeading } from '../../../../design-system/page-heading/page-heading'
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
        <ServerStorageProvisions />
        <ServerAccessKeys />
      </div>
    </div>
  )
}
