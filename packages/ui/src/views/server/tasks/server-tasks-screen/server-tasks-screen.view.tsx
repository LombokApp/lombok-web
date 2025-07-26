import type { ListServerTasksRequest } from '@stellariscloud/types'
import {
  cn,
  convertFiltersToSearchParams,
  DataTable,
  type FilterConfig,
  readFiltersFromSearchParams,
} from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { CircleCheck, CircleX, Clock10Icon, Play } from 'lucide-react'
import React from 'react'
import { useSearchParams } from 'react-router-dom'

import { $api } from '@/src/services/api'

import { serverTasksTableColumns } from './server-tasks-table-columns'

const FILTER_CONFIGS: Record<string, FilterConfig> = {
  search: { isSearchFilter: true },
  status: { paramPrefix: 'status' },
}

export function ServerTasksScreen() {
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
  const statusFilterValue = filters['status'] ?? []

  const listServerTasksQuery = $api.useQuery('get', '/api/v1/server/tasks', {
    params: {
      query: {
        limit: pagination.pageSize,
        offset: pagination.pageSize * pagination.pageIndex,
        sort: sorting[0]
          ? (`${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as ListServerTasksRequest['sort'])
          : undefined,
        search:
          typeof searchFilterValue === 'string' ? searchFilterValue : undefined,
        includeComplete: statusFilterValue.includes('COMPLETE')
          ? 'true'
          : undefined,
        includeFailed: statusFilterValue.includes('FAILED')
          ? 'true'
          : undefined,
        includeRunning: statusFilterValue.includes('RUNNING')
          ? 'true'
          : undefined,
        includeWaiting: statusFilterValue.includes('WAITING')
          ? 'true'
          : undefined,
      },
    },
  })
  const events = listServerTasksQuery.data
  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <DataTable
        title="Tasks"
        enableSearch={true}
        filters={filters}
        onColumnFiltersChange={onFiltersChange}
        rowCount={events?.meta.totalCount}
        data={events?.result ?? []}
        columns={serverTasksTableColumns}
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
        filterOptions={{
          status: {
            label: 'Status',
            options: [
              { value: 'WAITING', label: 'Waiting', icon: Clock10Icon },
              { value: 'RUNNING', label: 'Running', icon: Play },
              { value: 'COMPLETE', label: 'Complete', icon: CircleCheck },
              { value: 'FAILED', label: 'Failed', icon: CircleX },
            ],
          },
        }}
      />
    </div>
  )
}
