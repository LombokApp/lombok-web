import {
  ChevronRightIcon,
  ComputerDesktopIcon,
  Square3Stack3DIcon,
} from '@heroicons/react/24/outline'
import type { AppData } from '@stellariscloud/types'
import React from 'react'

import { EmptyState } from '../../../../design-system/empty-state/empty-state'
import { apiClient } from '../../../../services/api'
import { PageHeading } from '../../../../design-system/page-heading/page-heading'
import clsx from 'clsx'
import { StackedList } from '../../../../design-system/stacked-list/stacked-list'
import { Avatar } from '../../../../design-system/avatar'
import { Button } from '../../../../design-system/button/button'
import Link from 'next/link'

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
        'p-4 items-center flex flex-1 flex-col h-full overflow-x-hidden overflow-y-auto',
      )}
    >
      <div className="container flex-1 flex flex-col">
        <PageHeading
          titleIcon={Square3Stack3DIcon}
          title={'Apps'}
          subtitle="Review and manage apps installed on this server."
        />
        <dl className="divide-y divide-gray-100 dark:divide-gray-700">
          <StackedList
            items={
              installedApps?.map((app) => (
                <Link
                  href={`/server/apps/${app.identifier}`}
                  className="w-full flex-1"
                >
                  <div className="flex justify-between flex-1 items-center gap-x-4 text-gray-700 dark:text-gray-100">
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
                      <Button link icon={ChevronRightIcon} />
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
