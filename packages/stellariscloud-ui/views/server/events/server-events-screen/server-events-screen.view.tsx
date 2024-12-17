import type {
  EventDTO,
  ServerEventsApiListEventsRequest,
} from '@stellariscloud/api-client'
import React from 'react'

import { apiClient } from '../../../../services/api'
import { DataTable, cn } from '@stellariscloud/ui-toolkit'
import { PaginationState, SortingState } from '@tanstack/react-table'
import { serverEventsTableColumns } from './server-events-table-columns'
import { BugIcon, TriangleAlert, InfoIcon, OctagonAlert } from 'lucide-react'

export function ServerEventsScreen() {
  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >([])

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const searchFilter = filters.find((f) => f.id === 'identifier')
  const [events, setEvents] = React.useState<{
    result: EventDTO[]
    meta: { totalCount: number }
  }>()

  React.useEffect(() => {
    const levelFilterValue = filters.find((f) => f.id === 'level')?.value ?? []
    void apiClient.serverEventsApi
      .listEvents({
        limit: pagination.pageSize,
        offset: pagination.pageSize * pagination.pageIndex,
        ...(sorting[0]
          ? {
              sort: `${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as ServerEventsApiListEventsRequest['sort'],
            }
          : {}),
        ...(typeof searchFilter?.value === 'string'
          ? {
              search: searchFilter.value,
            }
          : {}),
        ...((levelFilterValue as any).includes('TRACE')
          ? { includeTrace: 'true' as const }
          : {}),
        ...((levelFilterValue as any).includes('DEBUG')
          ? { includeDebug: 'true' as const }
          : {}),
        ...((levelFilterValue as any).includes('INFO')
          ? { includeInfo: 'true' as const }
          : {}),
        ...((levelFilterValue as any).includes('WARNING')
          ? { includeWarning: 'true' as const }
          : {}),
        ...((levelFilterValue as any).includes('ERROR')
          ? { includeError: 'true' as const }
          : {}),
      })
      .then((response) => setEvents(response.data))
  }, [filters, sorting, pagination])
  return (
    <div className={cn('items-center flex flex-1 flex-col h-full')}>
      <DataTable
        title="Events"
        enableSearch={true}
        searchColumn="identifier"
        onColumnFiltersChange={(updater) => {
          setFilters((old) =>
            updater instanceof Function ? updater(old) : updater,
          )
        }}
        rowCount={events?.meta.totalCount}
        data={events?.result ?? []}
        columns={serverEventsTableColumns}
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
          level: {
            label: 'Level',
            options: [
              { value: 'TRACE', label: 'Trace', icon: InfoIcon },
              { value: 'DEBUG', label: 'Debug', icon: BugIcon },
              { value: 'INFO', label: 'Info', icon: InfoIcon },
              { value: 'WARNING', label: 'Warning', icon: TriangleAlert },
              { value: 'ERROR', label: 'Error', icon: OctagonAlert },
            ],
          },
        }}
      />
    </div>
  )
}
