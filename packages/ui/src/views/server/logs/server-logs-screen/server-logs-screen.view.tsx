import type { ServerLogsListRequest } from '@stellariscloud/types'
import { cn, DataTable } from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { BugIcon, InfoIcon, OctagonAlert, TriangleAlert } from 'lucide-react'
import React from 'react'
import { useSearchParams } from 'react-router-dom'

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

import { serverLogsTableColumns } from './server-logs-table-columns'

const FILTER_CONFIGS: Record<string, DataTableFilterConfig> = {
  search: { isSearchFilter: true },
  level: { paramPrefix: 'level', normalizeTo: 'upper' },
}

const DEFAULT_PAGE_SIZE = 10

export function ServerLogsScreen() {
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
  const levelFilterValue = filters['level'] ?? []

  const listServerLogsQuery = $api.useQuery('get', '/api/v1/server/logs', {
    params: {
      query: {
        limit: pagination.pageSize,
        offset: pagination.pageSize * pagination.pageIndex,
        sort:
          sorting.length > 0
            ? (sorting.map(
                (s) => `${s.id}-${s.desc ? 'desc' : 'asc'}`,
              ) as ServerLogsListRequest['sort'])
            : undefined,
        search:
          typeof searchFilterValue === 'string' ? searchFilterValue : undefined,
        includeTrace: levelFilterValue.includes('TRACE') ? 'true' : undefined,
        includeDebug: levelFilterValue.includes('DEBUG') ? 'true' : undefined,
        includeInfo: levelFilterValue.includes('INFO') ? 'true' : undefined,
        includeWarning: levelFilterValue.includes('WARN') ? 'true' : undefined,
        includeError: levelFilterValue.includes('ERROR') ? 'true' : undefined,
      },
    },
  })
  const logs = listServerLogsQuery.data
  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <DataTable
        title="Logs"
        enableSearch={true}
        filters={filters}
        onColumnFiltersChange={onFiltersChange}
        rowCount={logs?.meta.totalCount}
        data={logs?.result ?? []}
        columns={serverLogsTableColumns}
        sorting={sorting}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
        filterOptions={{
          level: {
            label: 'Level',
            options: [
              { value: 'TRACE', label: 'Trace', icon: InfoIcon },
              { value: 'DEBUG', label: 'Debug', icon: BugIcon },
              { value: 'INFO', label: 'Info', icon: InfoIcon },
              { value: 'WARN', label: 'Warning', icon: TriangleAlert },
              { value: 'ERROR', label: 'Error', icon: OctagonAlert },
            ],
          },
        }}
      />
    </div>
  )
}
