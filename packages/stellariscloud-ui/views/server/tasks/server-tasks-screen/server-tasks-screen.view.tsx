import type {
  ServerTasksApiListTasksRequest,
  TaskDTO,
} from '@stellariscloud/api-client'
import { cn, DataTable } from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { CircleCheck, CircleX, Clock10Icon, Play } from 'lucide-react'
import React from 'react'

import { apiClient } from '../../../../services/api'
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
  const [events, setTasks] = React.useState<{
    result: TaskDTO[]
    meta: { totalCount: number }
  }>()

  React.useEffect(() => {
    const statusFilterValue =
      filters.find((f) => f.id === 'status')?.value ?? []
    void apiClient.serverTasksApi
      .listTasks({
        limit: pagination.pageSize,
        offset: pagination.pageSize * pagination.pageIndex,
        ...(sorting[0]
          ? {
              sort: `${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as ServerTasksApiListTasksRequest['sort'],
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
      })
      .then((response) => setTasks(response.data))
  }, [filters, sorting, pagination, searchFilter?.value])
  return (
    <div className={cn('items-center flex flex-1 flex-col h-full')}>
      <DataTable
        title="Tasks"
        enableSearch={true}
        searchColumn="taskKey"
        onColumnFiltersChange={(updater) => {
          setFilters((old) =>
            updater instanceof Function ? updater(old) : updater,
          )
        }}
        rowCount={events?.meta.totalCount}
        data={events?.result ?? []}
        columns={serverTasksTableColumns}
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
