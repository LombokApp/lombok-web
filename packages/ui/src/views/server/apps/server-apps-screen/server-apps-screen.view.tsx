import type { ServerAppsListRequest } from '@lombokapp/types'
import { cn, DataTable } from '@lombokapp/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
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

import { serverAppsTableColumns } from './server-apps-table-columns'

const FILTER_CONFIGS: Record<string, DataTableFilterConfig> = {
  search: { isSearchFilter: true },
  enabled: { normalizeTo: 'lower' },
}

const DEFAULT_PAGE_SIZE = 10

export function ServerAppsScreen() {
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

  const listServerAppsQuery = $api.useQuery('get', '/api/v1/server/apps', {
    params: {
      query: {
        limit: pagination.pageSize,
        offset: pagination.pageSize * pagination.pageIndex,
        sort:
          sorting.length > 0
            ? (sorting.map(
                (s) => `${s.id}-${s.desc ? 'desc' : 'asc'}`,
              ) as ServerAppsListRequest['sort'])
            : undefined,
        search:
          typeof searchFilterValue === 'string' ? searchFilterValue : undefined,
        enabled:
          (filters.enabled?.length ?? 0) === 1
            ? filters.enabled?.[0]?.toLowerCase() === 'true'
              ? true
              : filters.enabled?.[0]?.toLowerCase() === 'false'
                ? false
                : undefined
            : undefined,
      },
    },
  })
  const apps = listServerAppsQuery.data

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <DataTable
        title="Apps"
        enableSearch={true}
        filters={filters}
        filterOptions={{
          enabled: {
            label: 'Enabled',
            options: [
              { label: 'Enabled', value: 'true' },
              { label: 'Disabled', value: 'false' },
            ],
          },
        }}
        onColumnFiltersChange={onFiltersChange}
        rowCount={apps?.meta.totalCount}
        data={apps?.result ?? []}
        columns={serverAppsTableColumns}
        sorting={sorting}
        pagination={pagination}
        onPaginationChange={handlePaginationChange}
        onSortingChange={handleSortingChange}
      />
    </div>
  )
}
