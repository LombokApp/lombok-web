import type { ServerTasksListRequest } from '@lombokapp/types'
import { DataTable } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { CircleCheck, CircleX, Clock10Icon, Play } from 'lucide-react'
import React from 'react'
import { useSearchParams } from 'react-router'

import { $api } from '@/src/services/api'
import type { DataTableFilterConfig } from '@/src/utils/tables'
import {
  convertFiltersToSearchParams,
  convertPaginationToSearchParams,
  convertSortingToSearchParams,
  readFiltersFromSearchParams,
  readPaginationFromSearchParams,
  readSortingFromSearchParams,
} from '@/src/utils/tables'

import { serverTasksTableColumns } from './server-tasks-table-columns'

const FILTER_CONFIGS: Record<string, DataTableFilterConfig> = {
  search: { isSearchFilter: true },
  status: { paramPrefix: 'status' },
}

const DEFAULT_PAGE_SIZE = 10

export function ServerTasksScreen() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = React.useState<Record<string, string[]>>(
    readFiltersFromSearchParams(searchParams, FILTER_CONFIGS),
  )

  // Keep local filters in sync with URL params
  React.useEffect(() => {
    const syncedFilters = readFiltersFromSearchParams(
      searchParams,
      FILTER_CONFIGS,
    )
    setFilters(syncedFilters)
  }, [searchParams])

  const onFiltersChange = React.useCallback(
    (newFilters: Record<string, string[]>) => {
      setFilters(newFilters)
      const newParams = convertFiltersToSearchParams(
        newFilters,
        searchParams,
        FILTER_CONFIGS,
      )
      setSearchParams(newParams)
    },
    [setSearchParams, searchParams],
  )

  const [sorting, setSorting] = React.useState<SortingState>(
    readSortingFromSearchParams(searchParams),
  )

  // Keep local sorting in sync with URL params
  React.useEffect(() => {
    const syncedSorting = readSortingFromSearchParams(searchParams)
    setSorting(syncedSorting)
  }, [searchParams])

  const handleSortingChange = React.useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting)
      const newParams = convertSortingToSearchParams(newSorting, searchParams)
      setSearchParams(newParams)
    },
    [setSearchParams, searchParams],
  )
  const [pagination, setPagination] = React.useState<PaginationState>(
    readPaginationFromSearchParams(searchParams, DEFAULT_PAGE_SIZE),
  )

  // Keep local pagination in sync with URL params
  React.useEffect(() => {
    const syncedPagination = readPaginationFromSearchParams(
      searchParams,
      DEFAULT_PAGE_SIZE,
    )
    setPagination(syncedPagination)
  }, [searchParams])

  const handlePaginationChange = React.useCallback(
    (newPagination: PaginationState) => {
      setPagination(newPagination)
      const newParams = convertPaginationToSearchParams(
        newPagination,
        searchParams,
        DEFAULT_PAGE_SIZE,
      )
      setSearchParams(newParams)
    },
    [setSearchParams, searchParams],
  )

  const searchFilterValue =
    'search' in filters ? filters['search'][0] : undefined
  const statusFilterValue = filters['status'] ?? []

  const listServerTasksQuery = $api.useQuery('get', '/api/v1/server/tasks', {
    params: {
      query: {
        limit: pagination.pageSize,
        offset: pagination.pageSize * pagination.pageIndex,
        sort:
          sorting.length > 0
            ? (sorting.map(
                (s) =>
                  `${s.id}-${s.desc ? 'desc' : 'asc'}` as ServerTasksListRequest['sort'],
              ) as ServerTasksListRequest['sort'])
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
    <div>
      <DataTable
        title="Tasks"
        enableSearch={true}
        filters={filters}
        onColumnFiltersChange={onFiltersChange}
        rowCount={events?.meta.totalCount}
        data={events?.result ?? []}
        columns={serverTasksTableColumns}
        sorting={sorting}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
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
