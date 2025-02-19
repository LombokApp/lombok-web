import type {
  AccessKeyDTO,
  ServerAccessKeysApiListServerAccessKeysRequest,
} from '@stellariscloud/api-client'
import { cn, DataTable } from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import React from 'react'

import { apiClient } from '../../../../../../services/api'
import { serverAccessKeysTableColumns } from './server-access-keys-table-columns'

export function ServerAccessKeysScreen() {
  const [accessKeys, setAccessKeys] = React.useState<{
    result: AccessKeyDTO[]
    meta: { totalCount: number }
  }>()
  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >([])

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const fetchAccessKeys = React.useCallback(() => {
    void apiClient.serverAccessKeysApi
      .listServerAccessKeys({
        limit: pagination.pageSize,
        offset: pagination.pageSize * pagination.pageIndex,
        ...(sorting[0]
          ? {
              sort: `${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as ServerAccessKeysApiListServerAccessKeysRequest['sort'],
            }
          : {}),
      })
      .then((resp) => {
        setAccessKeys(resp.data)
      })
  }, [sorting, pagination])

  React.useEffect(() => {
    fetchAccessKeys()
  }, [sorting, pagination, filters, fetchAccessKeys])

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <DataTable
        onColumnFiltersChange={(updater) => {
          setFilters((old) =>
            updater instanceof Function ? updater(old) : updater,
          )
        }}
        rowCount={accessKeys?.meta.totalCount}
        data={accessKeys?.result ?? []}
        columns={serverAccessKeysTableColumns}
        onPaginationChange={(updater) => {
          setPagination((old) =>
            updater instanceof Function ? updater(old) : updater,
          )
        }}
        onSortingChange={(updater) => {
          setSorting((old) =>
            updater instanceof Function ? updater(old) : updater,
          )
        }}
        // filterOptions={{
        //   status: {
        //     label: 'Status',
        //     options: [
        //       { value: 'WAITING', label: 'Waiting', icon: Clock10Icon },
        //       { value: 'RUNNING', label: 'Running', icon: Play },
        //       { value: 'COMPLETE', label: 'Complete', icon: CircleCheck },
        //       { value: 'FAILED', label: 'Failed', icon: CircleX },
        //     ],
        //   },
        // }}
      />
    </div>
  )
}
