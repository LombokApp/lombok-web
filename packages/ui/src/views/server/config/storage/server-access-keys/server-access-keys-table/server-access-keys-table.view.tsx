import type { AccessKeysListRequest } from '@lombokapp/sdk'
import { cn, DataTable } from '@lombokapp/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import React from 'react'

import { $api } from '@/src/services/api'

import { configureServerAccessKeysTableColumns } from './server-access-keys-table-columns'

export function ServerAccessKeysTable({
  openRotateModal,
  refreshKey,
}: {
  openRotateModal: (accessKey: {
    accessKeyHashId: string
    accessKeyId: string
    endpoint: string
    region: string
  }) => void
  refreshKey: string
}) {
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

  React.useEffect(() => {
    void refetch()
  }, [refetch, refreshKey])

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <DataTable
        rowCount={accessKeys?.meta.totalCount}
        data={accessKeys?.result ?? []}
        columns={configureServerAccessKeysTableColumns((accessKey) => {
          openRotateModal(accessKey)
        })}
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
      />
    </div>
  )
}
