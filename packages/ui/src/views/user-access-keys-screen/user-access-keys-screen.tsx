import type { AccessKeysListRequest } from '@stellariscloud/types'
import { DataTable, Separator, TypographyH3 } from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import React from 'react'
import { useSearchParams } from 'react-router-dom'

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

  // Initialize state from URL parameters
  const [sorting, setSorting] = React.useState<SortingState>(
    readSortingFromSearchParams(searchParams),
  )
  const [pagination, setPagination] = React.useState<PaginationState>(
    readPaginationFromSearchParams(searchParams),
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
    <div className="container flex flex-1 flex-col gap-3 self-center">
      <TypographyH3>Access Keys</TypographyH3>
      <Separator className="mb-3 bg-foreground/10" />

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
  )
}
