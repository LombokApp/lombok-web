import type { ModuleData } from '@stellariscloud/api-client'
import type { ConnectedModuleInstance } from '@stellariscloud/types'

import { Heading } from '../../design-system/typography'

export function ModuleDefinitionOverview({
  moduleInfo,
  connectedModuleInstances,
}: {
  moduleInfo: ModuleData
  connectedModuleInstances: ConnectedModuleInstance[]
}) {
  return (
    <div className="border border-gray-500 p-4 rounded-lg text-gray-500 dark:text-gray-400 flex flex-col gap-4">
      <div>
        <Heading level={6}>Name - ID</Heading>"{moduleInfo.name}" -{' '}
        {moduleInfo.id}
      </div>
      <div>
        <Heading level={6}>Connected instances</Heading>
        {connectedModuleInstances.map((instance) => (
          <>- {JSON.stringify({ ip: instance.ip, name: instance.name })}</>
        ))}
      </div>
      <div>
        <Heading level={6}>Config</Heading>
        <pre>{JSON.stringify(moduleInfo.config, null, 2)}</pre>
      </div>
    </div>
  )
}
