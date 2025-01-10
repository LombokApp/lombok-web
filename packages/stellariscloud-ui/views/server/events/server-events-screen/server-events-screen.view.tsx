import type {
  EventDTO,
  ServerEventsApiListEventsRequest,
} from '@stellariscloud/api-client'
import { cn, DataTable } from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { BugIcon, InfoIcon, OctagonAlert, TriangleAlert } from 'lucide-react'
import React from 'react'

import { apiClient } from '../../../../services/api'
import { serverEventsTableColumns } from './server-events-table-columns'

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
        ...((levelFilterValue as string[]).includes('TRACE')
          ? { includeTrace: 'true' as const }
          : {}),
        ...((levelFilterValue as string[]).includes('DEBUG')
          ? { includeDebug: 'true' as const }
          : {}),
        ...((levelFilterValue as string[]).includes('INFO')
          ? { includeInfo: 'true' as const }
          : {}),
        ...((levelFilterValue as string[]).includes('WARNING')
          ? { includeWarning: 'true' as const }
          : {}),
        ...((levelFilterValue as string[]).includes('ERROR')
          ? { includeError: 'true' as const }
          : {}),
      })
      .then((response) => setEvents(response.data))
  }, [filters, sorting, pagination, searchFilter?.value])
  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
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
