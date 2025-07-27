import type { FolderListRequest } from '@stellariscloud/types'
import {
  Button,
  DataTable,
  TypographyH3,
  useToast,
} from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import React from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

import { $api } from '@/src/services/api'
import type { DataTableFilterConfig } from '@/src/utils/tables'
import {
  convertFiltersToSearchParams,
  convertSortingToSearchParams,
  readFiltersFromSearchParams,
  readSortingFromSearchParams,
} from '@/src/utils/tables'

import type { CreateFolderModalData } from './create-folder-modal'
import { CreateFolderModal } from './create-folder-modal'
import { foldersTableColumns } from './folders-table-columns'

const FILTER_CONFIGS: Record<string, DataTableFilterConfig> = {
  search: { isSearchFilter: true },
}

export const FoldersScreen = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const [filters, setFilters] = React.useState<Record<string, string[]>>(
    readFiltersFromSearchParams(searchParams, FILTER_CONFIGS),
  )

  const onFiltersChange = React.useCallback(
    (newFilters: Record<string, string[]>) => {
      setFilters(newFilters)
      const newParams = convertFiltersToSearchParams(
        newFilters,
        searchParams,
        FILTER_CONFIGS,
      )
      setSearchParams(newParams)
    },
    [setSearchParams, searchParams],
  )

  const [sorting, setSorting] = React.useState<SortingState>(
    readSortingFromSearchParams(searchParams),
  )
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const handleSortingChange = React.useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting)
      const newParams = convertSortingToSearchParams(newSorting, searchParams)
      setSearchParams(newParams)
    },
    [setSearchParams, searchParams],
  )

  const searchFilterValue =
    'search' in filters ? filters['search'][0] : undefined

  const { data: userStorageProvisions, refetch: refetchUserStorageProvisions } =
    $api.useQuery(
      'get',
      '/api/v1/server/user-storage-provisions',
      {},
      {
        enabled: false,
      },
    )

  const [createFolderModalData, setCreateFolderModalData] =
    React.useState<CreateFolderModalData>({
      isOpen: false,
      userStorageProvisions: userStorageProvisions?.result ?? [],
    })

  const { data: folders, refetch: listFolders } = $api.useQuery(
    'get',
    '/api/v1/folders',
    {
      params: {
        query: {
          limit: pagination.pageSize,
          offset: pagination.pageSize * pagination.pageIndex,
          sort:
            sorting.length > 0
              ? (sorting.map(
                  (s) => `${s.id}-${s.desc ? 'desc' : 'asc'}`,
                ) as FolderListRequest['sort'])
              : undefined,
          search:
            typeof searchFilterValue === 'string'
              ? searchFilterValue
              : undefined,
        },
      },
    },
  )

  const { toast } = useToast()

  const createFolderMutation = $api.useMutation('post', '/api/v1/folders', {
    onSuccess: async (data) => {
      toast({
        title: 'Folder created',
        description: 'Navigating there now...',
      })
      await listFolders()
      await new Promise((resolve) => setTimeout(resolve, 1000))
      void navigate(`/folders/${data.folder.id}`)
    },
  })

  return (
    <div className="container flex h-full flex-col gap-3 self-center">
      <div className="flex justify-between gap-2">
        <div className="pl-2">
          <TypographyH3>Folders</TypographyH3>
        </div>
        <div>
          <Button
            variant={'outline'}
            onClick={() => {
              void refetchUserStorageProvisions().then(() => {
                setCreateFolderModalData({
                  ...createFolderModalData,
                  userStorageProvisions: userStorageProvisions?.result ?? [],
                  isOpen: true,
                })
              })
            }}
          >
            <div className="flex items-center gap-2">
              <PlusIcon className="size-5" />
              Create folder
            </div>
          </Button>
          <CreateFolderModal
            setModalData={setCreateFolderModalData}
            modalData={createFolderModalData}
            onSubmit={async (folderValues) => {
              await createFolderMutation.mutateAsync({
                body: folderValues,
              })
            }}
          />
        </div>
      </div>

      <DataTable
        enableSearch={true}
        filters={filters}
        onColumnFiltersChange={onFiltersChange}
        searchPlaceholder="Search Folders..."
        rowCount={folders?.meta.totalCount}
        data={folders?.result ?? []}
        columns={foldersTableColumns}
        sorting={sorting}
        onPaginationChange={setPagination}
        onSortingChange={handleSortingChange}
      />
    </div>
  )
}
