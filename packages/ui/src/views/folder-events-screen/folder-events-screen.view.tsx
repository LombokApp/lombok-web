import type { FolderEventsListRequest } from '@stellariscloud/types'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  cn,
  convertFiltersToSearchParams,
  DataTable,
  type FilterConfig,
  readFiltersFromSearchParams,
} from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { AlertTriangle, InfoIcon, MessageSquare, XCircle } from 'lucide-react'
import React from 'react'
import { useSearchParams } from 'react-router-dom'

import { useFolderContext } from '@/src/pages/folders/folder.context'
import { $api } from '@/src/services/api'

import { folderEventsTableColumns } from './folder-events-table-columns'

const FILTER_CONFIGS: Record<string, FilterConfig> = {
  search: { isSearchFilter: true },
  level: { paramPrefix: 'level' },
}

export function FolderEventsScreen() {
  const { folderId, folder } = useFolderContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = React.useState<Record<string, string[]>>(
    readFiltersFromSearchParams(searchParams, FILTER_CONFIGS),
  )

  const onFiltersChange = React.useCallback(
    (newFilters: Record<string, string[]>) => {
      setFilters(newFilters)
      setSearchParams(
        convertFiltersToSearchParams(newFilters, searchParams, FILTER_CONFIGS),
      )
    },
    [setSearchParams, searchParams],
  )

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const searchFilterValue =
    'search' in filters ? filters['search'][0] : undefined
  const levelFilterValue = filters['level'] ?? []

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
          sort: sorting[0]
            ? (`${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as FolderEventsListRequest['sort'])
            : undefined,
          search:
            typeof searchFilterValue === 'string'
              ? searchFilterValue
              : undefined,
          includeError: levelFilterValue.includes('ERROR') ? 'true' : undefined,
          includeWarning: levelFilterValue.includes('WARN')
            ? 'true'
            : undefined,
          includeInfo: levelFilterValue.includes('INFO') ? 'true' : undefined,
          includeDebug: levelFilterValue.includes('DEBUG') ? 'true' : undefined,
          includeTrace: levelFilterValue.includes('TRACE') ? 'true' : undefined,
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
              filters={filters}
              onColumnFiltersChange={onFiltersChange}
              rowCount={listFolderEventsQuery?.meta.totalCount}
              data={listFolderEventsQuery?.result ?? []}
              columns={folderEventsTableColumns}
              onPaginationChange={setPagination}
              onSortingChange={setSorting}
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
