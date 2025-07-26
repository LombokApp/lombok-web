import type { ListServerEventsRequest } from '@stellariscloud/types'
import { cn, DataTable } from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { BugIcon, InfoIcon, OctagonAlert, TriangleAlert } from 'lucide-react'
import React from 'react'

import { $api } from '@/src/services/api'

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
  const searchFilter = filters.find((f) => f.id === '__HIDDEN__')
  const levelFilterValue = filters.find((f) => f.id === 'level')?.value ?? []

  const listServerEventsQuery = $api.useQuery('get', '/api/v1/server/events', {
    params: {
      query: {
        limit: pagination.pageSize,
        offset: pagination.pageSize * pagination.pageIndex,
        sort: sorting[0]
          ? (`${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as ListServerEventsRequest['sort'])
          : undefined,
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
      },
    },
  })
  const events = listServerEventsQuery.data
  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <DataTable
        title="Events"
        enableSearch={true}
        searchColumn="__HIDDEN__"
        onColumnFiltersChange={(updatedValues) => setFilters(updatedValues)}
        rowCount={events?.meta.totalCount}
        data={events?.result ?? []}
        columns={serverEventsTableColumns}
        onPaginationChange={(updatedValues) => setPagination(updatedValues)}
        onSortingChange={(updatedValues) => setSorting(updatedValues)}
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
