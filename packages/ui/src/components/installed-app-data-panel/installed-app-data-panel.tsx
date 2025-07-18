import type { AppDTO, ExternalAppWorker } from '@stellariscloud/types'
import React from 'react'

import type { AppsTab } from './installed-app-tabs'
import { InstalledAppTabs } from './installed-app-tabs'

export function InstalledAppDataPanel({
  appInfo,
  externalAppWorkers,
}: {
  appInfo: AppDTO
  externalAppWorkers: Record<string, ExternalAppWorker | undefined>
}) {
  const [activeTab, setActiveTab] = React.useState<AppsTab>('config')
  const _connectedExternalAppWorkers = Object.keys(externalAppWorkers).map(
    (workerName) => ({
      id: externalAppWorkers[workerName]?.socketClientId ?? '',
      name: externalAppWorkers[workerName]?.workerId ?? '',
      ip: externalAppWorkers[workerName]?.ip ?? '',
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
        <div className="flex flex-col gap-4 overflow-x-auto rounded-md border border-gray-500 bg-black/20 p-2 text-gray-500 dark:text-gray-400">
          <pre>{JSON.stringify(appInfo.config, null, 2)}</pre>
        </div>
      )}
      {activeTab === 'events' && 'events'}
      {activeTab === 'logs' && 'logs'}
      {activeTab === 'workers' && (
        <div className="flex flex-col dark:text-gray-200">
          {_connectedExternalAppWorkers.length === 0 && <em>None</em>}
          {_connectedExternalAppWorkers.map((externalWorker) => (
            <div key={externalWorker.id} className="bg-black/20 p-4">
              <pre>
                {JSON.stringify(
                  {
                    ip: externalWorker.ip,
                    name: externalWorker.name,
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
