import React from 'react'
import { AccessKeyDTO } from '@stellariscloud/api-client'
import { apiClient } from '../../../../../../services/api'
import { DataTable, cn } from '@stellariscloud/ui-toolkit'
import { PaginationState, SortingState } from '@tanstack/react-table'
import { serverAccessKeysTableColumns } from './server-access-keys-table-columns'
import { ServerAccessKeysApiListServerAccessKeysRequest } from '@stellariscloud/api-client'

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
  }, [sorting, pagination, filters])

  React.useEffect(() => {
    void fetchAccessKeys()
  }, [sorting, pagination, filters])

  return (
    <div className={cn('items-center flex flex-1 flex-col h-full')}>
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
