import type {
  FolderPermissionName,
  ListFolderObjectsSortRequest,
} from '@stellariscloud/types'
import { FolderPermissionEnum, FolderPushMessage } from '@stellariscloud/types'
import {
  Button,
  cn,
  DataTable,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  useToast,
} from '@stellariscloud/ui-toolkit'
import type {
  ColumnFiltersState,
  PaginationState,
  SortingState,
} from '@tanstack/table-core'
import {
  CloudUpload,
  Ellipsis,
  Folder,
  FolderSync,
  Share2,
  Trash,
} from 'lucide-react'
import React from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'

import type { DeleteFolderModalData } from '@/src/components/delete-folder-modal/delete-folder-modal'
import { DeleteFolderModal } from '@/src/components/delete-folder-modal/delete-folder-modal'
import { EditableTitle } from '@/src/components/editable-title'
import {
  ReindexFolderModal,
  type ReindexFolderModalData,
} from '@/src/components/reindex-folder-modal/reindex-folder-modal'
import {
  UploadModal,
  type UploadModalData,
} from '@/src/components/upload-modal/upload-modal'
import { useLocalFileCacheContext } from '@/src/contexts/local-file-cache.context'
import { useFolderContext } from '@/src/pages/folders/folder.context'
import { $api } from '@/src/services/api'

import { FolderSidebar } from '../folder-sidebar/folder-sidebar.view'
import { folderObjectsTableColumns } from './folder-objects-table-columns'
import { FolderShareModal } from './folder-share-modal/folder-share-modal'

export const FolderDetailScreen = () => {
  const navigate = useNavigate()
  // const query = useQuery()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()

  const folderUpdateMutation = $api.useMutation(
    'put',
    '/api/v1/folders/{folderId}',
  )

  const params = useParams()
  const [folderId, focusedObjectKeyFromParams] = params['*']?.split('/') ?? []
  // const [queryParams] = useSearchParams()
  const [filters, setFilters] = React.useState<
    { id: string; value: unknown }[]
  >(
    searchParams.get('search')
      ? [{ id: 'search', value: searchParams.get('search') }]
      : [],
  )
  const searchFilter = filters.find((f) => f.id === 'main')
  const [sidebarOpen, _setSidebarOpen] = React.useState(true)
  const { uploadFile, uploadingProgress } = useLocalFileCacheContext()

  const [uploadModalData, setUploadModalData] = React.useState<UploadModalData>(
    {
      isOpen: false,
      uploadingProgress: {},
    },
  )

  // Create a reference to the current uploadingProgress for the modal
  const uploadModalRef = React.useRef<UploadModalData>({
    isOpen: false,
    uploadingProgress: {},
  })

  // Update the modal data when uploadingProgress changes
  React.useEffect(() => {
    if (uploadModalRef.current.isOpen) {
      setUploadModalData({
        isOpen: true,
        uploadingProgress,
      })
    }
  }, [uploadingProgress])

  // Update the ref when the modal state changes
  React.useEffect(() => {
    uploadModalRef.current = uploadModalData
  }, [uploadModalData])

  const [reindexFolderModalData, setReindexFolderModalData] =
    React.useState<ReindexFolderModalData>({
      isOpen: false,
    })
  const [
    forgetFolderConfirmationModelData,
    setForgetFolderConfirmationModelData,
  ] = React.useState<DeleteFolderModalData>({
    isOpen: false,
  })
  const [sorting, setSorting] = React.useState<SortingState>([])
  const pageFromUrl = searchParams.get('page')
  const [pagination, setPagination] = React.useState<PaginationState>({
    pageIndex: pageFromUrl ? parseInt(pageFromUrl, 10) - 1 : 0,
    pageSize: 10,
  })
  const listFolderObjectsQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/objects',
    {
      params: {
        path: {
          folderId,
        },
        query: {
          limit: pagination.pageSize,
          offset: pagination.pageIndex * pagination.pageSize,
          ...(searchFilter?.value
            ? { search: searchFilter.value as string }
            : {}),
          sort: sorting[0]
            ? (`${sorting[0].id}-${sorting[0].desc ? 'desc' : 'asc'}` as ListFolderObjectsSortRequest['sort'])
            : undefined,
        },
      },
    },
  )

  const messageHandler = React.useCallback(
    (name: FolderPushMessage, _payload: unknown) => {
      // console.log('folder socker messageHandler message:', { name, payload })
      if (
        [
          FolderPushMessage.OBJECTS_ADDED,
          FolderPushMessage.OBJECTS_REMOVED,
          FolderPushMessage.OBJECT_ADDED,
          FolderPushMessage.OBJECT_REMOVED,
          FolderPushMessage.OBJECT_UPDATED,
        ].includes(name)
      ) {
        void listFolderObjectsQuery.refetch()
      } else if (FolderPushMessage.OBJECT_UPDATED === name) {
        void listFolderObjectsQuery.refetch()
      }
    },
    [listFolderObjectsQuery],
  )
  const folderContext = useFolderContext(messageHandler)

  const reindexFolderMutation = $api.useMutation(
    'post',
    '/api/v1/folders/{folderId}/reindex',
  )

  const startOrContinueFolderReindex = React.useCallback(
    (_t?: string) => {
      if (folderContext.folderMetadata) {
        void reindexFolderMutation.mutateAsync({
          params: {
            path: {
              folderId: folderContext.folderId,
            },
          },
        })
      }
    },
    [
      folderContext.folderId,
      folderContext.folderMetadata,
      reindexFolderMutation,
    ],
  )

  const deleteFolderMutation = $api.useMutation(
    'delete',
    '/api/v1/folders/{folderId}',
    {
      onSuccess: () => navigate('/folders'),
    },
  )

  // eslint-disable-next-line @typescript-eslint/require-await
  const handleReindexFolder = React.useCallback(async () => {
    if (!reindexFolderModalData.isOpen) {
      setReindexFolderModalData({ isOpen: true })
    } else {
      startOrContinueFolderReindex(
        folderContext.folderMetadata?.indexingJobContext
          ?.indexingContinuationKey,
      )
      setReindexFolderModalData({ isOpen: false })
    }
  }, [
    startOrContinueFolderReindex,
    reindexFolderModalData,
    folderContext.folderMetadata?.indexingJobContext?.indexingContinuationKey,
  ])

  const handlePaginationChange = React.useCallback(
    (newPagination: PaginationState) => {
      setPagination(newPagination)
      setSearchParams({
        ...searchParams,
        page: `${newPagination.pageIndex + 1}`,
      })
    },
    [searchParams, setSearchParams],
  )

  const handleFiltersChange = React.useCallback(
    (newFilters: ColumnFiltersState) => {
      setFilters(newFilters)
      setSearchParams({
        ...searchParams,
        ...('search' in newFilters ? { search: newFilters.search } : {}),
      })
      const newSearchParams = {}

      // newSearchParams[]
      setSearchParams(newSearchParams)
    },
    [setSearchParams, searchParams],
  )

  const [shareModalData, setShareModalData] = React.useState<{
    isOpen: boolean
    shares?: { userId: string; permissions: string[] }[]
  }>({
    isOpen: false,
  })

  // Add this after other API hooks
  const listFolderSharesQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/shares',
    {
      params: {
        path: {
          folderId,
        },
      },
    },
  )

  const handleShareFolder = React.useCallback(async () => {
    if (!shareModalData.isOpen) {
      try {
        const shares = await listFolderSharesQuery.refetch()
        if (shares.data?.result) {
          setShareModalData({
            isOpen: true,
            shares: shares.data.result,
          })
        }
      } catch {
        toast({
          title: 'Error',
          variant: 'destructive',
          description: 'Could not fetch folder shares.',
        })
      }
    }
  }, [shareModalData.isOpen, listFolderSharesQuery, toast])

  const upsertFolderShareMutation = $api.useMutation(
    'post',
    '/api/v1/folders/{folderId}/shares/{userId}',
  )

  const handleUpsertManyShares = React.useCallback(
    async (values: {
      shares: { userId: string; permissions: FolderPermissionName[] }[]
    }) => {
      try {
        // Update each share individually
        for (const share of values.shares) {
          await upsertFolderShareMutation.mutateAsync({
            params: {
              path: {
                folderId,
                userId: share.userId,
              },
            },
            body: {
              permissions: share.permissions,
            },
          })
        }
      } catch (error) {
        console.error('Failed to update folder shares:', error)
      }
    },
    [folderId, upsertFolderShareMutation],
  )

  return (
    <>
      <DeleteFolderModal
        modalData={forgetFolderConfirmationModelData}
        setModalData={setForgetFolderConfirmationModelData}
        onConfirm={() =>
          deleteFolderMutation.mutateAsync({
            params: { path: { folderId: folderContext.folderId } },
          })
        }
      />
      <ReindexFolderModal
        modalData={reindexFolderModalData}
        setModalData={setReindexFolderModalData}
        onSubmit={handleReindexFolder}
      />
      <UploadModal
        modalData={uploadModalData}
        setModalData={setUploadModalData}
        onUpload={(file: File) =>
          uploadFile(folderContext.folderId, file.name, file)
        }
      />
      <FolderShareModal
        modalData={shareModalData}
        setModalData={setShareModalData}
        onSubmit={handleUpsertManyShares}
        folderId={folderContext.folderId}
      />
      <div className="flex flex-1 justify-around">
        <div
          className={cn(
            'z-10 flex size-full flex-1',
            'lg:container',
            focusedObjectKeyFromParams && 'opacity-0',
          )}
        >
          <div className="flex size-full flex-1 gap-4 overflow-hidden">
            <div className="flex h-full flex-1">
              {folderContext.folderMetadata?.totalCount === 0 ? (
                <div className="flex size-full flex-col items-center justify-center">
                  <div className="flex w-full max-w-md flex-col items-center p-8">
                    <div className="mb-6 flex size-20 items-center justify-center rounded-full bg-foreground/[.04] p-4">
                      <Folder
                        className="size-20 text-gray-400"
                        strokeWidth={1}
                      />
                    </div>
                    <h3 className="mb-3 text-xl font-medium">
                      This folder is empty
                    </h3>
                    <p className="mb-8 text-center text-sm opacity-75">
                      You can upload files or reindex the folder to discover
                      existing files.
                    </p>
                    <div className="flex gap-2">
                      <Button
                        onClick={() =>
                          setUploadModalData({
                            isOpen: true,
                            uploadingProgress,
                          })
                        }
                        variant="default"
                        className="flex items-center gap-2"
                      >
                        <CloudUpload className="size-6" />
                        Upload files
                      </Button>
                      <Button
                        onClick={() => void handleReindexFolder()}
                        variant="outline"
                        className="flex items-center gap-2"
                      >
                        <FolderSync className="size-6" />
                        Reindex folder
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex size-full flex-col">
                  <div className="flex justify-between">
                    <EditableTitle
                      value={folderContext.folder?.name ?? ''}
                      onChange={async (name) => {
                        await folderUpdateMutation.mutateAsync({
                          body: { name },
                          params: { path: { folderId } },
                        })
                      }}
                      placeholder="Enter folder name..."
                    />
                    <DropdownMenu>
                      <DropdownMenuTrigger className="m-1 rounded-full">
                        <div className="flex size-8 items-center justify-around rounded-full border">
                          <Ellipsis className="size-5 shrink-0" />
                        </div>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        {folderContext.folderPermissions?.includes(
                          FolderPermissionEnum.OBJECT_EDIT,
                        ) && (
                          <DropdownMenuItem
                            onClick={() =>
                              setUploadModalData({
                                isOpen: true,
                                uploadingProgress,
                              })
                            }
                            className="gap-2"
                          >
                            <CloudUpload className="size-5" />
                            Upload
                          </DropdownMenuItem>
                        )}
                        {folderContext.folderPermissions?.includes(
                          FolderPermissionEnum.FOLDER_REINDEX,
                        ) && (
                          <DropdownMenuItem
                            onClick={() =>
                              setReindexFolderModalData({
                                ...reindexFolderModalData,
                                isOpen: true,
                              })
                            }
                            className="gap-2"
                          >
                            <FolderSync className="size-5" />
                            Reindex
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => void handleShareFolder()}
                          className="gap-2"
                        >
                          <Share2 className="size-5" />
                          Share
                        </DropdownMenuItem>
                        {folderContext.folderPermissions?.includes(
                          FolderPermissionEnum.FOLDER_FORGET,
                        ) && (
                          <DropdownMenuItem
                            onClick={() =>
                              setForgetFolderConfirmationModelData({
                                ...forgetFolderConfirmationModelData,
                                isOpen: true,
                              })
                            }
                            className="gap-2"
                          >
                            <Trash className="size-5" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                  <div className="flex min-h-0 flex-1 flex-col">
                    <DataTable
                      cellPadding={'p-1.5'}
                      hideHeader={true}
                      enableSearch={true}
                      searchColumn={'main'}
                      onColumnFiltersChange={handleFiltersChange}
                      rowCount={folderContext.folderMetadata?.totalCount ?? 0}
                      data={listFolderObjectsQuery.data?.result ?? []}
                      columns={folderObjectsTableColumns}
                      onPaginationChange={handlePaginationChange}
                      pageIndex={pagination.pageIndex}
                      onSortingChange={setSorting}
                    />
                  </div>
                </div>
              )}
            </div>
            {sidebarOpen &&
              folderContext.folder &&
              folderContext.folderPermissions && (
                <div className="xs:w-full h-full md:w-[1/2] lg:w-[1/2] xl:w-2/5 2xl:w-[35%] 2xl:max-w-[35rem]">
                  <div className="h-full pr-1">
                    <FolderSidebar
                      folderMetadata={folderContext.folderMetadata}
                      folderAndPermission={{
                        folder: folderContext.folder,
                        permissions: folderContext.folderPermissions,
                      }}
                    />
                  </div>
                </div>
              )}
          </div>
        </div>
      </div>
    </>
  )
}
