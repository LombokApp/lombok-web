import React from 'react'

import { ServerStorageProvisions } from '../../settings/server-settings-screen/server-storage-provisions/server-storage-provisions.view'
import { ServerAccessKeysScreen } from '../server-access-keys-screen/server-access-keys-screen.view'
import clsx from 'clsx'
import { CircleStackIcon } from '@heroicons/react/24/outline'
import { TypographyH2 } from '@/components'

export function ServerStorageScreen() {
  return (
    <div className={clsx('p-4 items-center flex flex-1 flex-col h-full')}>
      <div className="container flex-1 flex flex-col">
        <div className="p-4">
          <TypographyH2>Storage</TypographyH2>
        </div>
        <ServerStorageProvisions />
        <ServerAccessKeysScreen />
      </div>
    </div>
  )
}
