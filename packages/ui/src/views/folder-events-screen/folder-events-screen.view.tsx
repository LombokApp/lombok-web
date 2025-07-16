import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  DataTable,
} from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { AlertTriangle, InfoIcon, MessageSquare, XCircle } from 'lucide-react'
import React from 'react'

import { useFolderContext } from '@/src/pages/folders/folder.context'
import type { FolderEventsListRequest } from '@/src/services/api'
import { $api } from '@/src/services/api'

import { folderEventsTableColumns } from './folder-events-table-columns'

export function FolderEventsScreen() {
  const { folderId, folder } = useFolderContext()
  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >([])

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const searchFilter = filters.find((f) => f.id === 'eventKey')
  const levelFilterValue = filters.find((f) => f.id === 'level')?.value ?? []

  const { data: listFolderEventsQuery } = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/events',
    {
      params: {
        path: {
          folderId,
        },
        query: {
          limit: pagination.pageSize,
          offset: pagination.pageSize * pagination.pageIndex,
          sort: (sorting[0]
            ? `${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}`
            : undefined) as FolderEventsListRequest['sort'] | undefined,
          search:
            typeof searchFilter?.value === 'string'
              ? searchFilter.value
              : undefined,
          includeError: (levelFilterValue as string[]).includes('ERROR')
            ? 'true'
            : undefined,
          includeWarning: (levelFilterValue as string[]).includes('WARN')
            ? 'true'
            : undefined,
          includeInfo: (levelFilterValue as string[]).includes('INFO')
            ? 'true'
            : undefined,
          includeDebug: (levelFilterValue as string[]).includes('DEBUG')
            ? 'true'
            : undefined,
          includeTrace: (levelFilterValue as string[]).includes('TRACE')
            ? 'true'
            : undefined,
        },
      },
    },
  )

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <div className="container flex flex-1 flex-col">
        <Card className="border-0 bg-transparent">
          <CardHeader className="p-0 pb-4">
            <CardTitle>Folder Events</CardTitle>
            <CardDescription>Folder: {folder?.name}</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            <DataTable
              enableSearch={true}
              searchColumn={'eventKey'}
              onColumnFiltersChange={setFilters}
              rowCount={listFolderEventsQuery?.meta.totalCount}
              data={listFolderEventsQuery?.result ?? []}
              columns={folderEventsTableColumns}
              onPaginationChange={setPagination}
              onSortingChange={(updater) => {
                setSorting((old) =>
                  updater instanceof Function ? updater(old) : updater,
                )
              }}
              filterOptions={{
                level: {
                  label: 'Level',
                  options: [
                    { value: 'ERROR', label: 'Error', icon: XCircle },
                    { value: 'WARN', label: 'Warning', icon: AlertTriangle },
                    { value: 'INFO', label: 'Info', icon: InfoIcon },
                    { value: 'DEBUG', label: 'Debug', icon: MessageSquare },
                    { value: 'TRACE', label: 'Trace', icon: MessageSquare },
                  ],
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
