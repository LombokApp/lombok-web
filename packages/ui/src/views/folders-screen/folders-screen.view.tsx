import { Button, DataTable, useToast } from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import React from 'react'
import { useNavigate } from 'react-router-dom'

import { $api } from '@/src/services/api'

import type { CreateFolderModalData } from './create-folder-modal'
import { CreateFolderModal } from './create-folder-modal'
import { foldersTableColumns } from './folders-table-columns'

export const FoldersScreen = () => {
  const navigate = useNavigate()
  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >([])

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const searchFilter = filters.find((f) => f.id === 'name')

  const { data: userStorageProvisions, refetch: refetchUserStorageProvisions } =
    $api.useQuery('get', '/api/v1/server/user-storage-provisions', {
      enabled: false,
    })

  const [createFolderModalData, setCreateFolderModalData] =
    React.useState<CreateFolderModalData>({
      isOpen: false,
      userStorageProvisions: userStorageProvisions?.result ?? [],
    })

  const { data: folders, refetch: listFolders } = $api.useQuery(
    'get',
    '/api/v1/folders',
    {
      queries: {
        limit: pagination.pageSize,
        offset: pagination.pageSize * pagination.pageIndex,
        sort: sorting[0]
          ? `${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}`
          : undefined,
        search:
          typeof searchFilter?.value === 'string'
            ? searchFilter.value
            : undefined,
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
      <DataTable
        title="Folders"
        enableSearch={true}
        searchColumn="name"
        onColumnFiltersChange={setFilters}
        searchPlaceholder="Search Folders..."
        rowCount={folders?.meta.totalCount}
        data={folders?.result ?? []}
        columns={foldersTableColumns}
        onPaginationChange={setPagination}
        onSortingChange={setSorting}
        actionComponent={
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
        }
      />
    </div>
  )
}
