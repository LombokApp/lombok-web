import type { ServerEventsApiListEventsRequest } from '@stellariscloud/api-client'
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

import { useFolderContext } from '../../pages/folders/folder.context'
import { serverEventsApiHooks } from '../../services/api'
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

  const listFolderEventsQuery = serverEventsApiHooks.useListEvents(
    {
      folderId,
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
      ...((levelFilterValue as string[]).includes('ERROR')
        ? { includeError: 'true' }
        : {}),
      ...((levelFilterValue as string[]).includes('WARN')
        ? { includeWarning: 'true' }
        : {}),
      ...((levelFilterValue as string[]).includes('INFO')
        ? { includeInfo: 'true' }
        : {}),
      ...((levelFilterValue as string[]).includes('DEBUG')
        ? { includeDebug: 'true' }
        : {}),
      ...((levelFilterValue as string[]).includes('TRACE')
        ? { includeTrace: 'true' }
        : {}),
    },
    { enabled: !!folderId },
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
              rowCount={listFolderEventsQuery.data?.meta.totalCount}
              data={listFolderEventsQuery.data?.result ?? []}
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
