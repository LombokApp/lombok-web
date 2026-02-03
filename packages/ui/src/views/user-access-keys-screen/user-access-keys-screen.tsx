import type { AccessKeysListRequest } from '@lombokapp/types'
import { DataTable } from '@lombokapp/ui-toolkit/components/data-table/data-table'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import React from 'react'
import { useSearchParams } from 'react-router'

import { $api } from '@/src/services/api'
import {
  convertPaginationToSearchParams,
  convertSortingToSearchParams,
  readPaginationFromSearchParams,
  readSortingFromSearchParams,
} from '@/src/utils/tables'

import { configureUserAccessKeysTableColumns } from './user-access-keys-table-columns'

export function UserAccessKeysScreen() {
  const [searchParams, setSearchParams] = useSearchParams()

  const DEFAULT_PAGE_SIZE = 10

  // Initialize state from URL parameters
  const [sorting, setSorting] = React.useState<SortingState>(
    readSortingFromSearchParams(searchParams),
  )
  const [pagination, setPagination] = React.useState<PaginationState>(
    readPaginationFromSearchParams(searchParams, DEFAULT_PAGE_SIZE),
  )

  // URL synchronization handlers
  const handleSortingChange = React.useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting)
      const newParams = convertSortingToSearchParams(newSorting, searchParams)
      setSearchParams(newParams)
    },
    [setSearchParams, searchParams],
  )

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

  const listAccessKeysQuery = $api.useQuery('get', '/api/v1/access-keys', {
    params: {
      query: {
        limit: pagination.pageSize,
        offset: pagination.pageSize * pagination.pageIndex,
        sort:
          sorting.length > 0
            ? (sorting.map(
                (s) =>
                  `${s.id}-${s.desc ? 'desc' : 'asc'}` as AccessKeysListRequest['sort'],
              ) as AccessKeysListRequest['sort'])
            : undefined,
      },
    },
  })

  const accessKeys = listAccessKeysQuery.data

  // Handle refetch when keys are rotated
  const handleKeyRotate = React.useCallback(() => {
    void listAccessKeysQuery.refetch()
  }, [listAccessKeysQuery])

  return (
    <div className="flex h-full max-h-full flex-1 flex-col gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Access Keys</h1>
        <p className="text-muted-foreground">Your access keys.</p>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <DataTable
          rowCount={accessKeys?.meta.totalCount}
          data={accessKeys?.result ?? []}
          columns={configureUserAccessKeysTableColumns(handleKeyRotate)}
          onPaginationChange={handlePaginationChange}
          onSortingChange={handleSortingChange}
          sorting={sorting}
          pagination={pagination}
        />
      </div>
    </div>
  )
}
