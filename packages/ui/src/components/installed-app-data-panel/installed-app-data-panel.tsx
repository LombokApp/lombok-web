import type { AppDTO } from '@stellariscloud/api-client'
import type { ConnectedAppWorker } from '@stellariscloud/types'
import React from 'react'

import type { AppsTab } from './installed-app-tabs'
import { InstalledAppTabs } from './installed-app-tabs'

export function InstalledAppDataPanel({
  appInfo,
  connectedAppInstances,
}: {
  appInfo: AppDTO
  connectedAppInstances: Record<string, ConnectedAppWorker | undefined>
}) {
  const [activeTab, setActiveTab] = React.useState<AppsTab>('config')
  const _connectedAppInstances = Object.keys(connectedAppInstances).map(
    (workerName) => ({
      id: connectedAppInstances[workerName]?.socketClientId ?? '',
      name: connectedAppInstances[workerName]?.workerId ?? '',
      ip: connectedAppInstances[workerName]?.ip ?? '',
    }),
  )

  return (
    <div>
      <div className="pb-4">
        <InstalledAppTabs
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as AppsTab)}
        />
      </div>
      {activeTab === 'config' && (
        <div className="dark:text-gray-400 flex flex-col gap-4 overflow-x-auto rounded-md border border-gray-500 bg-black/20 p-2 text-gray-500">
          <pre>{JSON.stringify(appInfo.config, null, 2)}</pre>
        </div>
      )}
      {activeTab === 'events' && 'events'}
      {activeTab === 'logs' && 'logs'}
      {activeTab === 'workers' && (
        <div className="dark:text-gray-200 flex flex-col">
          {_connectedAppInstances.length === 0 && <em>None</em>}
          {_connectedAppInstances.map((instance) => (
            <div key={instance.id} className="bg-black/20 p-4">
              <pre>
                {JSON.stringify(
                  {
                    ip: instance.ip,
                    name: instance.name,
                  },
                  null,
                  2,
                )}
              </pre>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
