import type { ListServerTasksRequest } from '@stellariscloud/types'
import { cn, DataTable } from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { CircleCheck, CircleX, Clock10Icon, Play } from 'lucide-react'
import React from 'react'

import { $api } from '@/src/services/api'

import { serverTasksTableColumns } from './server-tasks-table-columns'

export function ServerTasksScreen() {
  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >([])

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const searchFilter = filters.find((f) => f.id === 'taskKey')
  const statusFilterValue = filters.find((f) => f.id === 'status')?.value ?? []

  const listServerTasksQuery = $api.useQuery('get', '/api/v1/server/tasks', {
    params: {
      query: {
        limit: pagination.pageSize,
        offset: pagination.pageSize * pagination.pageIndex,
        ...(sorting[0]
          ? {
              sort: `${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as ListServerTasksRequest['sort'],
            }
          : {}),
        ...(typeof searchFilter?.value === 'string'
          ? {
              search: searchFilter.value,
            }
          : {}),
        ...((statusFilterValue as string[]).includes('COMPLETE')
          ? { includeComplete: 'true' }
          : {}),
        ...((statusFilterValue as string[]).includes('FAILED')
          ? { includeFailed: 'true' }
          : {}),
        ...((statusFilterValue as string[]).includes('RUNNING')
          ? { includeRunning: 'true' }
          : {}),
        ...((statusFilterValue as string[]).includes('WAITING')
          ? { includeWaiting: 'true' }
          : {}),
      },
    },
  })
  const events = listServerTasksQuery.data
  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <DataTable
        title="Tasks"
        enableSearch={true}
        searchColumn="taskKey"
        onColumnFiltersChange={setFilters}
        rowCount={events?.meta.totalCount}
        data={events?.result ?? []}
        columns={serverTasksTableColumns}
        onPaginationChange={setPagination}
        onSortingChange={(updater) => {
          setSorting((old) =>
            updater instanceof Function ? updater(old) : updater,
          )
        }}
        filterOptions={{
          status: {
            label: 'Status',
            options: [
              { value: 'WAITING', label: 'Waiting', icon: Clock10Icon },
              { value: 'RUNNING', label: 'Running', icon: Play },
              { value: 'COMPLETE', label: 'Complete', icon: CircleCheck },
              { value: 'FAILED', label: 'Failed', icon: CircleX },
            ],
          },
        }}
      />
    </div>
  )
}
