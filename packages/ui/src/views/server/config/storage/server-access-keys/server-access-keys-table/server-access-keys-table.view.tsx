import type { AccessKeysListRequest } from '@stellariscloud/sdk'
import { cn, DataTable } from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import React from 'react'

import { $api } from '@/src/services/api'

import { configureServerAccessKeysTableColumns } from './server-access-keys-table-columns'

export function ServerAccessKeysTable() {
  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const { data: accessKeys, refetch } = $api.useQuery(
    'get',
    '/api/v1/server/access-keys',
    {
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
    },
  )

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <DataTable
        rowCount={accessKeys?.meta.totalCount}
        data={accessKeys?.result ?? []}
        columns={configureServerAccessKeysTableColumns(() => {
          void refetch()
        })}
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
      />
    </div>
  )
}
