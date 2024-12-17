import React from 'react'

import { apiClient } from '../../../../services/api'
import { DataTable, cn } from '@stellariscloud/ui-toolkit'
import { AppDTO } from '@stellariscloud/api-client'
import { serverAppsTableColumns } from './server-apps-table-columns'
import {
  ColumnFilter,
  ColumnFiltersState,
  Updater,
} from '@tanstack/react-table'

export function ServerAppsScreen() {
  const [coreAppResetKey, _setCoreAppResetKey] = React.useState('__')
  const [installedApps, setInstalledApps] = React.useState<AppDTO[]>()
  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >([])

  React.useEffect(() => {
    void apiClient.appsApi.listApps().then((apps) => {
      setInstalledApps(apps.data.result)
    })
  }, [coreAppResetKey])

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
    <div className={cn('items-center flex flex-1 flex-col h-full')}>
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
