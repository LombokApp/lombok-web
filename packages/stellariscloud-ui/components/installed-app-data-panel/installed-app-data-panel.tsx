import type { ConnectedAppInstance, AppData } from '@stellariscloud/types'
import React from 'react'

import type { ModulesTab } from './installed-app-tabs'
import { InstalledAppTabs } from './installed-app-tabs'

export function InstalledAppDataPanel({
  appInfo,
  connectedAppInstances,
}: {
  appInfo: AppData
  connectedAppInstances: {
    [name: string]: ConnectedAppInstance | undefined
  }
}) {
  const [activeTab, setActiveTab] = React.useState<ModulesTab>('config')
  const _connectedAppInstances = Object.keys(connectedAppInstances).map(
    (workerName) => ({
      id: connectedAppInstances[workerName]?.id ?? '',
      name: connectedAppInstances[workerName]?.name ?? '',
      ip: connectedAppInstances[workerName]?.ip ?? '',
    }),
  )

  return (
    <div>
      <div className="pb-4">
        <InstalledAppTabs
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as ModulesTab)}
        />
      </div>
      {activeTab === 'config' && (
        <div className="border border-gray-500 p-2 rounded-md text-gray-500 dark:text-gray-400 flex flex-col gap-4 bg-black/20 overflow-x-auto">
          <pre>{JSON.stringify(appInfo.config, null, 2)}</pre>
        </div>
      )}
      {activeTab === 'events' && 'events'}
      {activeTab === 'logs' && 'logs'}
      {activeTab === 'workers' && (
        <div className="flex flex-col text-wite dark:text-gray-200">
          {_connectedAppInstances.length === 0 && <em>None</em>}
          {_connectedAppInstances.map((instance) => (
            <div key={instance.id} className="p-4 bg-black/20">
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
