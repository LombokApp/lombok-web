import type { AccessKeysListRequest } from '@stellariscloud/types'
import { DataTable, Separator, TypographyH2 } from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import React from 'react'

import { $api } from '@/src/services/api'

import { configureUserAccessKeysTableColumns } from './user-access-keys-table-columns'

export function UserAccessKeysScreen() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

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

  return (
    <div className="container flex flex-1 flex-col gap-3 self-center">
      <TypographyH2 className="pb-0">Access Keys</TypographyH2>
      <Separator className="mb-3 bg-foreground/10" />

      <DataTable
        rowCount={accessKeys?.meta.totalCount}
        data={accessKeys?.result ?? []}
        columns={configureUserAccessKeysTableColumns(() => {
          void listAccessKeysQuery.refetch()
        })}
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
      />
    </div>
  )
}
