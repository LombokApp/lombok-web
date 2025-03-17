import {
  ArrowPathIcon,
  ArrowUpOnSquareIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import type {
  FolderObjectDTO,
  FoldersApiListFolderObjectsRequest,
} from '@stellariscloud/api-client'
import { FolderPermissionEnum, FolderPushMessage } from '@stellariscloud/types'
import { Button, cn, DataTable } from '@stellariscloud/ui-toolkit'
import { Folder } from 'lucide-react'
import React from 'react'
import {
  useLocation,
  useNavigate,
  useParams,
  useSearchParams,
} from 'react-router-dom'

import { ConfirmForgetFolderModal } from '../../components/confirm-forget-folder-modal/confirm-forget-folder-modal'
import { ConfirmRefreshFolderModal } from '../../components/confirm-refresh-folder-modal/confirm-refresh-folder-modal'
import { UploadModal } from '../../components/upload-modal/upload-modal'
import { useFolderContext } from '../../contexts/folder.context'
import { useLocalFileCacheContext } from '../../contexts/local-file-cache.context'
import { EmptyState } from '../../design-system/empty-state/empty-state'
import { apiClient } from '../../services/api'
import { FolderSidebar } from '../folder-sidebar/folder-sidebar.view'
import { folderObjectsTableColumns } from './folder-objects-table-columns'
import { PaginationState, SortingState } from '@tanstack/table-core'

export const FolderDetailScreen = () => {
  const navigate = useNavigate()

  const params = useParams()
  const [folderId, focusedObjectKeyFromParams] = params['*']?.split('/') ?? []
  const [queryParams] = useSearchParams()
  const location = useLocation()
  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >([])

  const searchFilter = filters.find((f) => f.id === 'objectKey')

  const [refreshFolderConfirmationOpen, setRefreshFolderConfirmationOpen] =
    React.useState(false)
  const [uploadOpen, setUploadOpen] = React.useState(false)
  const [forgetFolderConfirmationOpen, setForgetFolderConfirmationOpen] =
    React.useState(false)

  const [sidebarOpen, _setSidebarOpen] = React.useState(true)

  const [pageState, setPageState] = React.useState<{
    search?: string
  }>({
    search: queryParams.get('search') ?? undefined,
  })

  const [sorting, setSorting] = React.useState<SortingState>([])
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  })

  const [folderObjects, setFolderObjects] = React.useState<{
    results: FolderObjectDTO[] | undefined
    startIndex: number
    totalCount?: number
    searchTerm?: string
  }>({ results: [], startIndex: 0, totalCount: 0 })

  const { getData, uploadFile, uploadingProgress } = useLocalFileCacheContext()

  const messageHandler = React.useCallback(
    (name: FolderPushMessage, payload: unknown) => {
      if (
        [
          FolderPushMessage.OBJECTS_ADDED,
          FolderPushMessage.OBJECTS_REMOVED,
          FolderPushMessage.OBJECT_ADDED,
          FolderPushMessage.OBJECT_REMOVED,
        ].includes(name)
      ) {
        setFolderObjects({
          results: [],
          startIndex: 0,
          searchTerm: searchFilter?.value as string,
        })
      } else if (FolderPushMessage.OBJECT_UPDATED === name) {
        const folderObject = payload as FolderObjectDTO
      }
    },
    [],
  )
  const folderContext = useFolderContext(messageHandler)

  const startOrContinueFolderRefresh = React.useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (t?: string) => {
      if (folderContext.folderMetadata) {
        void apiClient.foldersApi.rescanFolder({
          folderId: folderContext.folderId,
        })
      }
    },
    [folderContext.folderId, folderContext.folderMetadata],
  )

  const handleForgetFolder = () => {
    if (!forgetFolderConfirmationOpen) {
      setForgetFolderConfirmationOpen(true)
    } else {
      setForgetFolderConfirmationOpen(false)
      void apiClient.foldersApi
        .deleteFolder({ folderId: folderContext.folderId })
        .then(() => navigate('/folders'))
    }
  }

  const handleRefreshFolder = React.useCallback(() => {
    if (!refreshFolderConfirmationOpen) {
      setRefreshFolderConfirmationOpen(true)
    } else {
      startOrContinueFolderRefresh(
        folderContext.folderMetadata?.indexingJobContext
          ?.indexingContinuationKey,
      )
      setRefreshFolderConfirmationOpen(false)
    }
  }, [
    startOrContinueFolderRefresh,
    refreshFolderConfirmationOpen,
    folderContext.folderMetadata?.indexingJobContext?.indexingContinuationKey,
  ])

  const handleUploadStart = React.useCallback(() => {
    setUploadOpen(true)
  }, [])

  const fetchFolderObjects = React.useCallback(() => {
    if (folderId) {
      void apiClient.foldersApi
        .listFolderObjects({
          folderId: folderId,
          limit: pagination.pageSize,
          offset: pagination.pageSize * pagination.pageIndex,
          search:
            typeof searchFilter?.value === 'string'
              ? searchFilter.value
              : undefined,
          ...(sorting[0]
            ? {
                sort: `${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as FoldersApiListFolderObjectsRequest['sort'],
              }
            : {}),
          ...(typeof searchFilter?.value === 'string'
            ? {
                search: searchFilter.value,
              }
            : {}),
        })
        .then((resp) =>
          setFolderObjects({
            totalCount: resp.data.meta.totalCount,
            startIndex: 0,
            results: resp.data.result,
          }),
        )
    }
  }, [
    filters,
    folderId,
    pagination.pageSize,
    pagination.pageIndex,
    sorting,
    searchFilter?.value,
  ])

  React.useEffect(() => {
    if (folderId) {
      fetchFolderObjects()
    }
  }, [folderId, filters, sorting, pagination, fetchFolderObjects])

  return (
    <>
      {uploadOpen && (
        <UploadModal
          uploadingProgress={uploadingProgress}
          onUpload={(file: File) =>
            uploadFile(folderContext.folderId, file.name, file)
          }
          onCancel={() => setUploadOpen(false)}
        />
      )}
      {forgetFolderConfirmationOpen && (
        <ConfirmForgetFolderModal
          onConfirm={() => handleForgetFolder()}
          onCancel={() => setForgetFolderConfirmationOpen(false)}
        />
      )}
      {refreshFolderConfirmationOpen && (
        <ConfirmRefreshFolderModal
          onConfirm={() => handleRefreshFolder()}
          onCancel={() => setRefreshFolderConfirmationOpen(false)}
        />
      )}
      <div className="relative flex size-full flex-1">
        <div
          className={cn(
            'z-10 flex size-full flex-1 pl-4',
            focusedObjectKeyFromParams && 'opacity-0',
          )}
        >
          <div className="flex size-full flex-1 flex-col">
            <div className="px-4 py-2">
              <div className="flex gap-2 pt-2">
                {folderContext.folderPermissions?.includes(
                  FolderPermissionEnum.OBJECT_EDIT,
                ) && (
                  <Button size="sm" onClick={handleUploadStart}>
                    <div className="flex items-center gap-1">
                      <ArrowUpOnSquareIcon className="size-5" />
                      Upload
                    </div>
                  </Button>
                )}
                {folderContext.folderPermissions?.includes(
                  FolderPermissionEnum.FOLDER_RESCAN,
                ) && (
                  <Button size="sm" onClick={handleRefreshFolder}>
                    <div className="flex items-center gap-1">
                      <ArrowPathIcon className="size-5" />
                      Refresh
                    </div>
                  </Button>
                )}
                {folderContext.folderPermissions?.includes(
                  FolderPermissionEnum.FOLDER_FORGET,
                ) && (
                  <Button
                    variant={'destructive'}
                    size="sm"
                    onClick={handleForgetFolder}
                  >
                    <TrashIcon className="size-5" />
                  </Button>
                )}
              </div>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <div className="flex flex-1 overflow-hidden">
                <div className="h-full flex-1 overflow-hidden">
                  {folderContext.folderMetadata?.totalCount === 0 ? (
                    <div className="flex size-full flex-col items-center justify-around">
                      <div className="min-w-[30rem] max-w-[30rem]">
                        <EmptyState
                          icon={Folder}
                          text={'No objects. Try refreshing the folder.'}
                          onButtonPress={handleRefreshFolder}
                          buttonText="Refresh folder"
                        />
                      </div>
                    </div>
                  ) : (
                    <DataTable
                      enableSearch={true}
                      searchColumn={'objectKey'}
                      onColumnFiltersChange={(updater) => {
                        setFilters((old) =>
                          updater instanceof Function ? updater(old) : updater,
                        )
                      }}
                      rowCount={folderContext.folderMetadata?.totalCount}
                      data={folderObjects.results ?? []}
                      columns={folderObjectsTableColumns}
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
                    />
                  )}
                </div>
              </div>
              {sidebarOpen &&
                folderContext.folder &&
                folderContext.folderPermissions && (
                  <div className="xs:w-full md:w-[1/2] lg:w-[1/2] xl:w-2/5 2xl:w-[35%] 2xl:max-w-[35rem]">
                    <FolderSidebar
                      onRescan={() => setRefreshFolderConfirmationOpen(true)}
                      folderMetadata={folderContext.folderMetadata}
                      folderAndPermission={{
                        folder: folderContext.folder,
                        permissions: folderContext.folderPermissions,
                      }}
                    />
                  </div>
                )}
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
