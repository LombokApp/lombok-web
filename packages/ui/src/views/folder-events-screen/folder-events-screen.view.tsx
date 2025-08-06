import type { FolderEventsListRequest } from '@stellariscloud/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  DataTable,
} from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import React from 'react'
import { useSearchParams } from 'react-router-dom'

import { useFolderContext } from '@/src/pages/folders/folder.context'
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

import { folderEventsTableColumns } from './folder-events-table-columns'

const FILTER_CONFIGS: Record<string, DataTableFilterConfig> = {
  search: { isSearchFilter: true },
  objectKey: { paramPrefix: 'objectKey' },
}

export function FolderEventsScreen() {
  const { folderId, folder } = useFolderContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = React.useState<Record<string, string[]>>(
    readFiltersFromSearchParams(searchParams, FILTER_CONFIGS),
  )

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

  const handleSortingChange = React.useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting)
      const newParams = convertSortingToSearchParams(newSorting, searchParams)
      setSearchParams(newParams)
    },
    [setSearchParams, searchParams],
  )

  const [pagination, setPagination] = React.useState<PaginationState>(
    readPaginationFromSearchParams(searchParams),
  )

  const handlePaginationChange = React.useCallback(
    (newPagination: PaginationState) => {
      setPagination(newPagination)
      const newParams = convertPaginationToSearchParams(
        newPagination,
        searchParams,
      )
      setSearchParams(newParams)
    },
    [setSearchParams, searchParams],
  )

  const searchFilterValue =
    'search' in filters ? filters['search'][0] : undefined
  const objectKeyFilterValue =
    'objectKey' in filters ? filters['objectKey'][0] : undefined

  const { data: listFolderEventsQuery } = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/events',
    {
      params: {
        path: {
          folderId,
        },
        query: {
          limit: pagination.pageSize,
          offset: pagination.pageSize * pagination.pageIndex,
          sort:
            sorting.length > 0
              ? (sorting.map(
                  (s) =>
                    `${s.id}-${s.desc ? 'desc' : 'asc'}` as FolderEventsListRequest['sort'],
                ) as FolderEventsListRequest['sort'])
              : undefined,
          search:
            typeof searchFilterValue === 'string'
              ? searchFilterValue
              : undefined,
          objectKey:
            typeof objectKeyFilterValue === 'string'
              ? objectKeyFilterValue
              : undefined,
        },
      },
    },
  )

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <div className="container flex flex-1 flex-col">
        <Card className="border-0 bg-transparent">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Folder Events</CardTitle>
            <CardDescription>Folder: {folder?.name}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              enableSearch={true}
              filters={filters}
              onColumnFiltersChange={onFiltersChange}
              rowCount={listFolderEventsQuery?.meta.totalCount}
              data={listFolderEventsQuery?.result ?? []}
              columns={folderEventsTableColumns}
              sorting={sorting}
              pagination={pagination}
              onPaginationChange={handlePaginationChange}
              onSortingChange={handleSortingChange}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
