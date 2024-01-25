import { ComputerDesktopIcon } from '@heroicons/react/24/outline'
import type {
  ConnectedModuleInstancesMap,
  ModuleData,
} from '@stellariscloud/types'
import React from 'react'

import { InstalledModuleDataPanel } from '../../../components/installed-module-data-panel/installed-module-data-panel'
import { EmptyState } from '../../../design-system/empty-state/empty-state'
import { serverApi } from '../../../services/api'

export function ServerModulesScreen() {
  const [coreModuleResetKey, _setCoreModuleResetKey] = React.useState('__')
  const [installedModules, setInstalledModules] = React.useState<ModuleData[]>()
  const [connectedModuleInstances, setConnectedModuleInstances] =
    React.useState<ConnectedModuleInstancesMap>()

  React.useEffect(() => {
    void serverApi.listModules().then((modules) => {
      setInstalledModules(modules.data.installed)
      setConnectedModuleInstances(modules.data.connected)
    })
  }, [coreModuleResetKey])

  return (
    <div className="">
      <dl className="divide-y divide-gray-100 dark:divide-gray-700">
        {installedModules?.map((module, i) => {
          return (
            <div
              key={i}
              className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0"
            >
              <dt className="text-md font-medium leading-6 text-gray-900 dark:text-gray-200">
                <span className="text-xl">Module: {module.identifier}</span>
                <div className="mt-1 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:col-span-2 sm:mt-0">
                  {module.config.description}
                </div>
              </dt>
              <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
                <div className="pb-4">
                  <InstalledModuleDataPanel
                    moduleInfo={module}
                    connectedModuleInstances={
                      connectedModuleInstances?.[module.identifier] ?? {}
                    }
                  />
                </div>
              </dd>
            </div>
          )
        })}
        {installedModules?.length === 0 && (
          <EmptyState
            icon={ComputerDesktopIcon}
            text="No modules are installed"
          />
        )}
      </dl>
    </div>
  )
}
