import { cn, DataTable } from '@stellariscloud/ui-toolkit'
import React from 'react'
import { useSearchParams } from 'react-router-dom'

import { $api } from '@/src/services/api'
import type { DataTableFilterConfig } from '@/src/utils/tables'
import {
  convertFiltersToSearchParams,
  readFiltersFromSearchParams,
} from '@/src/utils/tables'

import { serverAppsTableColumns } from './server-apps-table-columns'

const FILTER_CONFIGS: Record<string, DataTableFilterConfig> = {
  search: { isSearchFilter: true },
}

export function ServerAppsScreen() {
  const { data: installedApps } = $api.useQuery('get', '/api/v1/server/apps')

  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = React.useState<Record<string, string[]>>(
    readFiltersFromSearchParams(searchParams, FILTER_CONFIGS),
  )

  const onFiltersChange = React.useCallback(
    (newFilters: Record<string, string[]>) => {
      setFilters(newFilters)
      setSearchParams(
        convertFiltersToSearchParams(newFilters, searchParams, FILTER_CONFIGS),
      )
    },
    [setSearchParams, searchParams],
  )

  const searchFilterValue =
    'search' in filters ? filters['search'][0] : undefined

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <DataTable
        title="Apps"
        enableSearch={true}
        filters={filters}
        onColumnFiltersChange={onFiltersChange}
        data={
          installedApps?.result
            ? searchFilterValue
              ? installedApps.result.filter((app) =>
                  app.identifier.includes(searchFilterValue),
                )
              : installedApps.result
            : []
        }
        columns={serverAppsTableColumns}
      />
    </div>
  )
}
