import { ComputerDesktopIcon } from '@heroicons/react/24/outline'
import type { ConnectedAppInstancesMap, AppData } from '@stellariscloud/types'
import React from 'react'

import { InstalledAppDataPanel } from '../../../components/installed-app-data-panel/installed-app-data-panel'
import { EmptyState } from '../../../design-system/empty-state/empty-state'
import { apiClient } from '../../../services/api'

export function ServerAppsScreen() {
  const [coreAppResetKey, _setCoreAppResetKey] = React.useState('__')
  const [installedApps, setInstalledApps] = React.useState<AppData[]>()
  const [connectedAppInstances, setConnectedAppInstances] =
    React.useState<ConnectedAppInstancesMap>()

  React.useEffect(() => {
    void apiClient.appsApi.listApps().then((apps) => {
      setInstalledApps(apps.data.result)
      // setConnectedAppInstances(apps.data.connected)
    })
  }, [coreAppResetKey])

  return (
    <div className="">
      <dl className="divide-y divide-gray-100 dark:divide-gray-700">
        {installedApps?.map((app, i) => {
          return (
            <div
              key={i}
              className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
            >
              <dt className="text-md font-medium leading-6 text-gray-900 dark:text-gray-200">
                <span className="text-xl">App: {app.identifier}</span>
                <div className="mt-1 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:col-span-2 sm:mt-0">
                  {app.config.description}
                </div>
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                <div className="pb-4">
                  <InstalledAppDataPanel
                    appInfo={app}
                    connectedAppInstances={
                      connectedAppInstances?.[app.identifier]?.reduce(
                        (acc, next) => ({ ...acc, [next.id]: next }),
                        {},
                      ) ?? {}
                    }
                  />
                </div>
              </dd>
            </div>
          )
        })}
        {installedApps?.length === 0 && (
          <EmptyState icon={ComputerDesktopIcon} text="No apps are installed" />
        )}
      </dl>
    </div>
  )
}
