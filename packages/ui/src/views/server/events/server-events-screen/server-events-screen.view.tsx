import type { ListServerEventsRequest } from '@stellariscloud/types'
import {
  cn,
  convertFiltersToSearchParams,
  DataTable,
  type FilterConfig,
  readFiltersFromSearchParams,
} from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { BugIcon, InfoIcon, OctagonAlert, TriangleAlert } from 'lucide-react'
import React from 'react'
import { useSearchParams } from 'react-router-dom'

import { $api } from '@/src/services/api'

import { serverEventsTableColumns } from './server-events-table-columns'

const FILTER_CONFIGS: Record<string, FilterConfig> = {
  search: { isSearchFilter: true },
  level: { paramPrefix: 'level' },
}

export function ServerEventsScreen() {
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

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const searchFilterValue =
    'search' in filters ? filters['search'][0] : undefined
  const levelFilterValue = filters['level'] ?? []

  const listServerEventsQuery = $api.useQuery('get', '/api/v1/server/events', {
    params: {
      query: {
        limit: pagination.pageSize,
        offset: pagination.pageSize * pagination.pageIndex,
        sort: sorting[0]
          ? (`${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as ListServerEventsRequest['sort'])
          : undefined,
        search:
          typeof searchFilterValue === 'string' ? searchFilterValue : undefined,
        includeTrace: levelFilterValue.includes('TRACE') ? 'true' : undefined,
        includeDebug: levelFilterValue.includes('DEBUG') ? 'true' : undefined,
        includeInfo: levelFilterValue.includes('INFO') ? 'true' : undefined,
        includeWarning: levelFilterValue.includes('WARNING')
          ? 'true'
          : undefined,
        includeError: levelFilterValue.includes('ERROR') ? 'true' : undefined,
      },
    },
  })
  const events = listServerEventsQuery.data
  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <DataTable
        title="Events"
        enableSearch={true}
        filters={filters}
        onColumnFiltersChange={onFiltersChange}
        rowCount={events?.meta.totalCount}
        data={events?.result ?? []}
        columns={serverEventsTableColumns}
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
        filterOptions={{
          level: {
            label: 'Level',
            options: [
              { value: 'TRACE', label: 'Trace', icon: InfoIcon },
              { value: 'DEBUG', label: 'Debug', icon: BugIcon },
              { value: 'INFO', label: 'Info', icon: InfoIcon },
              { value: 'WARNING', label: 'Warning', icon: TriangleAlert },
              { value: 'ERROR', label: 'Error', icon: OctagonAlert },
            ],
          },
        }}
      />
    </div>
  )
}
