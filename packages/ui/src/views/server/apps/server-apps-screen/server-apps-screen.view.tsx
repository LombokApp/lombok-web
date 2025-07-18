import { cn, DataTable } from '@stellariscloud/ui-toolkit'
import type { ColumnFiltersState, Updater } from '@tanstack/react-table'
import React from 'react'

import { $api } from '@/src/services/api'

import { serverAppsTableColumns } from './server-apps-table-columns'

export function ServerAppsScreen() {
  const { data: installedApps } = $api.useQuery('get', '/api/v1/server/apps')

  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >([])

  const handleColumnFiltersChange = React.useCallback(
    (updater: Updater<ColumnFiltersState>) => {
      setFilters((old) =>
        updater instanceof Function ? updater(old) : updater,
      )
    },
    [],
  )

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
        onColumnFiltersChange={handleColumnFiltersChange}
        columns={serverAppsTableColumns}
      />
    </div>
  )
}
