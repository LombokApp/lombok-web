import {
  ChevronRightIcon,
  ComputerDesktopIcon,
} from '@heroicons/react/24/outline'
import React from 'react'

import { EmptyState } from '../../../../design-system/empty-state/empty-state'
import { apiClient } from '../../../../services/api'
import clsx from 'clsx'
import { StackedList } from '../../../../design-system/stacked-list/stacked-list'
import { Avatar } from '../../../../design-system/avatar'
import Link from 'next/link'
import { Button } from '@stellariscloud/ui-toolkit'
import { AppData } from '@stellariscloud/types'

export function ServerAppsScreen() {
  const [coreAppResetKey, _setCoreAppResetKey] = React.useState('__')
  const [installedApps, setInstalledApps] = React.useState<AppData[]>()

  React.useEffect(() => {
    void apiClient.appsApi.listApps().then((apps) => {
      setInstalledApps(apps.data.installed.result)
    })
  }, [coreAppResetKey])

  return (
    <div
      className={clsx(
        'items-center flex flex-1 flex-col h-full overflow-x-hidden overflow-y-auto',
      )}
    >
      <div className="container flex-1 flex flex-col">
        <dl className="dark:divide-gray-700">
          <StackedList
            items={
              installedApps?.map((app) => (
                <Link
                  href={`/server/apps/${app.identifier}`}
                  className="w-full flex-1 p-4 py-2"
                >
                  <div className="flex justify-between flex-1 items-center gap-x-4">
                    <Avatar
                      uniqueKey={app.identifier}
                      size="sm"
                      className="bg-indigo-100"
                    />
                    <div className="flex flex-col truncate">
                      <span className="uppercase">{app.identifier}</span>

                      <div className="mt-1 flex items-center gap-x-2 text-xs leading-5 truncate">
                        <p className="truncate opacity-80 dark:opacity-50">
                          Public Key {app.config.publicKey}
                        </p>
                      </div>
                    </div>
                    <div className="self-end">
                      <Button variant={'link'}>
                        <ChevronRightIcon className="w-5 h-3" />
                      </Button>
                    </div>
                  </div>
                </Link>
              )) ?? []
            }
          />
          {installedApps?.length === 0 && (
            <EmptyState
              icon={ComputerDesktopIcon}
              text="No apps are installed"
            />
          )}
        </dl>
      </div>
    </div>
  )
}
