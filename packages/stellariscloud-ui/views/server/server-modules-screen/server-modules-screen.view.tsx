import { ComputerDesktopIcon } from '@heroicons/react/24/outline'
import type { ModuleData } from '@stellariscloud/api-client'
import type { ConnectedModuleInstancesMap } from '@stellariscloud/types'
import React from 'react'

import { ModuleDefinitionOverview } from '../../../components/module-definition-overview/module-definition-overview'
import { EmptyState } from '../../../design-system/empty-state/empty-state'
import { serverApi } from '../../../services/api'

export function ServerModulesScreen() {
  const [coreModuleResetKey, _setCoreModuleResetKey] = React.useState('__')
  const [coreModule, setCoreModule] = React.useState<ModuleData>()
  const [connectedModuleInstances, setConnectedModuleInstances] =
    React.useState<ConnectedModuleInstancesMap>()

  React.useEffect(() => {
    void serverApi.listModules().then((modules) => {
      const _coreModule = modules.data.installed.find((m) => m.name === 'core')
      setCoreModule(_coreModule)
      setConnectedModuleInstances(modules.data.connected)
    })
  }, [coreModuleResetKey])

  return (
    <div className="">
      <dl className="divide-y divide-gray-100 dark:divide-gray-700">
        <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <dt className="text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
            Core Module
            <div className="mt-1 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:col-span-2 sm:mt-0">
              A module implementing core functionality. This is a separate node
              process and can be run alongside the core app or deployed on
              another host.
            </div>
          </dt>
          <dd className="mt-1 text-sm leading-6 sm:col-span-2 sm:mt-0">
            {coreModule && connectedModuleInstances?.[coreModule.id] && (
              <ModuleDefinitionOverview
                connectedModuleInstances={Object.keys(
                  connectedModuleInstances[coreModule.id] ?? {},
                ).map((name) => ({
                  id: connectedModuleInstances[coreModule.id]?.[name]?.id ?? '',
                  name:
                    connectedModuleInstances[coreModule.id]?.[name]?.name ?? '',
                  ip: connectedModuleInstances[coreModule.id]?.[name]?.ip ?? '',
                }))}
                moduleInfo={coreModule}
              />
            )}
          </dd>
        </div>
        <div className="px-4 py-6 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-0">
          <dt className="text-sm font-medium leading-6 text-gray-900 dark:text-gray-200">
            Custom Modules
            <div className="mt-1 mr-4 font-normal text-sm leading-6 text-gray-500 dark:text-gray-400 sm:col-span-2 sm:mt-0">
              Non-core modules installed in this server.
            </div>
          </dt>
          <dd className="mt-1 text-sm leading-6 text-gray-700 sm:col-span-2 sm:mt-0">
            <div className="pb-4">
              <EmptyState
                buttonText="Add Module"
                icon={ComputerDesktopIcon}
                text="No custom modules are installed"
              />
            </div>
          </dd>
        </div>
      </dl>
    </div>
  )
}
