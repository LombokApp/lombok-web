import React from 'react'
import { CircleCheck, CircleX, Clock10Icon, Play } from 'lucide-react'
import { tasksTableColumns } from './task-table-columns'
import { DataTable, cn } from '@stellariscloud/ui-toolkit'
import { TaskDTO, TasksApiListTasksRequest } from '@stellariscloud/api-client'
import { useFolderContext } from '../../contexts/folder.context'
import { apiClient } from '../../services/api'
import {
  FilterMeta,
  PaginationState,
  Row,
  SortingState,
} from '@tanstack/react-table'

export function FolderTasksScreen() {
  const [tasks, setTasks] = React.useState<{
    meta: { totalCount: number }
    result: TaskDTO[]
  }>()
  const { folder } = useFolderContext()
  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >([])

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const fetchTasks = React.useCallback(() => {
    console.log({ filters, sorting })
    const statusFilterValue =
      filters.find((f) => f.id === 'status')?.value ?? []
    if (folder?.id) {
      void apiClient.tasksApi
        .listTasks({
          folderId: folder?.id,
          limit: pagination.pageSize,
          offset: pagination.pageSize * pagination.pageIndex,
          ...(sorting[0]
            ? {
                sort: `${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as TasksApiListTasksRequest['sort'],
              }
            : {}),
          ...((statusFilterValue as any).includes('COMPLETE')
            ? { includeComplete: 'true' }
            : {}),
          ...((statusFilterValue as any).includes('FAILED')
            ? { includeFailed: 'true' }
            : {}),
          ...((statusFilterValue as any).includes('RUNNING')
            ? { includeRunning: 'true' }
            : {}),
          ...((statusFilterValue as any).includes('WAITING')
            ? { includeWaiting: 'true' }
            : {}),
        })
        .then((resp) => setTasks(resp.data))
    }
  }, [folder?.id, filters, sorting, pagination])

  React.useEffect(() => {
    if (folder?.id) {
      void fetchTasks()
    }
  }, [folder?.id, filters, sorting])

  return (
    <div
      className={cn(
        'items-center flex flex-1 flex-col h-full overflow-x-hidden overflow-y-auto p-8',
      )}
    >
      <div className="container flex-1 flex flex-col">
        <DataTable
          onColumnFiltersChange={(updater) => {
            setFilters((old) =>
              updater instanceof Function ? updater(old) : updater,
            )
          }}
          rowCount={tasks?.meta.totalCount}
          data={tasks?.result ?? []}
          columns={tasksTableColumns}
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
          filterFns={{
            status: (
              row: Row<TaskDTO>,
              columnId: string,
              filterValue: any,
              addMeta: (meta: FilterMeta) => void,
            ) => {
              console.log('filter:', { row, columnId, filterValue, addMeta })
              return true
            },
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
    </div>
  )
}
