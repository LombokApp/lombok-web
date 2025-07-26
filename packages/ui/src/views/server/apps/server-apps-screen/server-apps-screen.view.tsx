import { cn, DataTable } from '@stellariscloud/ui-toolkit'
import React from 'react'

import { $api } from '@/src/services/api'

import { serverAppsTableColumns } from './server-apps-table-columns'

export function ServerAppsScreen() {
  const { data: installedApps } = $api.useQuery('get', '/api/v1/server/apps')

  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >([])

  const searchFilterValue = filters.find((f) => f.id === 'identifier')
    ?.value as string | undefined

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <DataTable
        title="Apps"
        enableSearch={true}
        searchColumn="identifier"
        data={
          installedApps?.result
            ? searchFilterValue
              ? installedApps.result.filter((app) =>
                  app.identifier.includes(searchFilterValue),
                )
              : installedApps.result
            : []
        }
        onColumnFiltersChange={setFilters}
        columns={serverAppsTableColumns}
      />
    </div>
  )
}
