import type {
  FolderGetResponse,
  FoldersApiCreateFolderRequest,
  FoldersApiListFoldersRequest,
  UserStorageProvisionDTO,
} from '@stellariscloud/api-client'
import { Button, DataTable, useToast } from '@stellariscloud/ui-toolkit'
import type { PaginationState, SortingState } from '@tanstack/react-table'
import { PlusIcon } from 'lucide-react'
import React from 'react'
import { useNavigate, useParams } from 'react-router-dom'

import { apiClient, foldersApiHooks } from '../../services/api'
import type { CreateFolderModalData } from './create-folder-modal'
import { CreateFolderModal } from './create-folder-modal'
import { foldersTableColumns } from './folders-table-columns'

export const FoldersScreen = () => {
  const navigate = useNavigate()
  const params = useParams()
  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >([])

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })
  const searchFilter = filters.find((f) => f.id === 'name')
  const [folders, setFolders] = React.useState<{
    meta: { totalCount: number }
    result: FolderGetResponse[]
  }>()
  const [folderFormKey, setFolderFormKey] = React.useState<string>()
  const [forgetFolderConfirmationOpen, setForgetFolderConfirmationOpen] =
    React.useState<string | false>(false)

  const [userStorageProvisions, setUserStorageProvisions] = React.useState<
    UserStorageProvisionDTO[]
  >([])

  const [createFolderModalData, setCreateFolderModalData] =
    React.useState<CreateFolderModalData>({
      isOpen: false,
      userStorageProvisions,
    })

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const handleForgetFolder = React.useCallback(
    (folderId: string) => {
      if (!forgetFolderConfirmationOpen) {
        setForgetFolderConfirmationOpen(folderId)
      } else {
        setForgetFolderConfirmationOpen(false)
        void apiClient.foldersApi.deleteFolder({ folderId }).then(() =>
          setFolders((state) => {
            return {
              result:
                folders?.result.filter((b) => b.folder.id !== folderId) ?? [],
              meta: { totalCount: state?.meta.totalCount ?? 0 },
            }
          }),
        )
      }
    },
    [forgetFolderConfirmationOpen, folders?.result],
  )

  const fetchUserProvisions = () =>
    apiClient.userStorageProvisionsApi
      .listUserStorageProvisions()
      .then((resp) => {
        setUserStorageProvisions(resp.data.result)
        return resp.data.result
      })

  const listFolders = foldersApiHooks.useListFolders(
    {
      limit: pagination.pageSize,
      offset: pagination.pageSize * pagination.pageIndex,
      ...(sorting[0]
        ? {
            sort: `${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as FoldersApiListFoldersRequest['sort'],
          }
        : {}),
      ...(typeof searchFilter?.value === 'string'
        ? {
            search: searchFilter.value,
          }
        : {}),
    },
    { retry: 0 },
  )

  const refreshFolders = React.useCallback(() => {
    void listFolders.refetch().then((response) => setFolders(response.data))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listFolders.refetch, pagination, filters, sorting])

  const { toast } = useToast()

  // reflect add query flag state
  React.useEffect(() => {
    if (params.add === 'true' && !folderFormKey) {
      setFolderFormKey(`${Math.random()}`)
    } else if (params.add !== 'true' && folderFormKey) {
      setFolderFormKey(undefined)
    }
  }, [params.add, folderFormKey])

  React.useEffect(() => {
    refreshFolders()
  }, [refreshFolders])

  const handleCreateFolder = async (
    folder: FoldersApiCreateFolderRequest['folderCreateInputDTO'],
  ) => {
    return apiClient.foldersApi
      .createFolder({
        folderCreateInputDTO: folder,
      })
      .then(
        async ({
          data: {
            folder: { id },
          },
        }) => {
          toast({
            title: 'Folder created',
            description: 'Navigating there now...',
          })
          await listFolders.refetch()
          await new Promise((resolve) => setTimeout(resolve, 1000))
          void navigate(`/folders/${id}`)
        },
      )
  }

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
                void fetchUserProvisions().then((_userStorageProvisions) => {
                  setCreateFolderModalData({
                    ...createFolderModalData,
                    userStorageProvisions: _userStorageProvisions,
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
              onSubmit={handleCreateFolder}
            />
          </div>
        }
      />
    </div>
  )
}
