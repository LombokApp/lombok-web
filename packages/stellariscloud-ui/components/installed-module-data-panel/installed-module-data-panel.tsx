import type { ConnectedModuleInstance, ModuleData } from '@stellariscloud/types'
import React from 'react'

import type { ModulesTab } from './modules-tabs'
import { ModulesTabs } from './modules-tabs'

export function InstalledModuleDataPanel({
  moduleInfo,
  connectedModuleInstances,
}: {
  moduleInfo: ModuleData
  connectedModuleInstances: {
    [name: string]: ConnectedModuleInstance | undefined
  }
}) {
  const [activeTab, setActiveTab] = React.useState<ModulesTab>('config')
  const _connectedModuleInstances = Object.keys(connectedModuleInstances).map(
    (workerName) => ({
      id: connectedModuleInstances[workerName]?.id ?? '',
      name: connectedModuleInstances[workerName]?.name ?? '',
      ip: connectedModuleInstances[workerName]?.ip ?? '',
    }),
  )

  return (
    <div>
      <div className="pb-4">
        <ModulesTabs
          activeTab={activeTab}
          onChange={(t) => setActiveTab(t as ModulesTab)}
        />
      </div>
      {activeTab === 'config' && (
        <div className="border border-gray-500 p-2 rounded-md text-gray-500 dark:text-gray-400 flex flex-col gap-4 bg-black/20 overflow-x-auto">
          <pre>{JSON.stringify(moduleInfo.config, null, 2)}</pre>
        </div>
      )}
      {activeTab === 'events' && 'events'}
      {activeTab === 'logs' && 'logs'}
      {activeTab === 'workers' && (
        <div className="flex flex-col text-wite dark:text-gray-200">
          {_connectedModuleInstances.length === 0 && <em>None</em>}
          {_connectedModuleInstances.map((instance) => (
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
