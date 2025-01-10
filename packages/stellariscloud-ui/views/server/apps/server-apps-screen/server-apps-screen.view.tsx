import type { AppDTO } from '@stellariscloud/api-client'
import { cn, DataTable } from '@stellariscloud/ui-toolkit'
import type { ColumnFiltersState, Updater } from '@tanstack/react-table'
import React from 'react'

import { apiClient } from '../../../../services/api'
import { serverAppsTableColumns } from './server-apps-table-columns'

export function ServerAppsScreen() {
  const [appListResetKey, _setAppListResetKey] = React.useState('__')
  const [installedApps, setInstalledApps] = React.useState<AppDTO[]>()
  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >([])

  React.useEffect(() => {
    void apiClient.appsApi.listApps().then((apps) => {
      setInstalledApps(apps.data.result)
    })
  }, [appListResetKey])

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
          installedApps
            ? searchFilterValue
              ? installedApps.filter((app) =>
                  app.identifier.includes(searchFilterValue),
                )
              : installedApps
            : []
        }
        onColumnFiltersChange={handleColumnFiltersChange}
        columns={serverAppsTableColumns}
      />
    </div>
  )
}
