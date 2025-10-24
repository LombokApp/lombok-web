import type {
  FolderObjectsListRequest,
  FolderPermissionName,
} from '@lombokapp/types'
import { FolderPermissionEnum, FolderPushMessage, isOk } from '@lombokapp/types'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import {
  type ColumnFilterOptions,
  StandaloneToolbar,
} from '@lombokapp/ui-toolkit/components/data-table'
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@lombokapp/ui-toolkit/components/dropdown-menu'
import { DropdownMenu } from '@lombokapp/ui-toolkit/components/dropdown-menu/dropdown-menu'
import { useToast } from '@lombokapp/ui-toolkit/hooks'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { useQueryClient } from '@tanstack/react-query'
import type { SortingState } from '@tanstack/table-core'
import {
  CloudUpload,
  Ellipsis,
  Folder,
  FolderSync,
  LayoutDashboard,
  List,
  Share2,
  Trash,
} from 'lucide-react'
import React from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router'

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
import { useFolderContext } from '@/src/contexts/folder'
import { useLocalFileCacheContext } from '@/src/contexts/local-file-cache'
import { useFocusedFolderObjectContext } from '@/src/pages/folders/focused-folder-object.context'
import { $api, $apiClient } from '@/src/services/api'
import type { DataTableFilterConfig } from '@/src/utils/tables'
import {
  readFiltersFromSearchParams,
  readSortingFromSearchParams,
} from '@/src/utils/tables'

import { FolderSidebar } from '../folder-sidebar/folder-sidebar.view'
import { FolderShareModal } from './folder-share-modal/folder-share-modal'
import { JustifiedObjectsGrid } from './justified-objects-grid/justified-objects-grid'

const PAGE_SIZE = 50

const FILTER_CONFIGS: Record<string, DataTableFilterConfig> = {
  search: { isSearchFilter: true },
  mediaType: { paramPrefix: 'mediaType' },
}

const FILTER_OPTIONS: Record<string, ColumnFilterOptions> = {
  mediaType: {
    label: 'Media Type',
    options: [
      { label: 'Images', value: 'IMAGE' },
      { label: 'Videos', value: 'VIDEO' },
      { label: 'Audio', value: 'AUDIO' },
      { label: 'Documents', value: 'DOCUMENT' },
      { label: 'Unknown', value: 'UNKNOWN' },
    ],
  },
}

const SORT_OPTIONS = [
  { id: 'objectKey', label: 'Object Key' },
  { id: 'createdAt', label: 'Created' },
  { id: 'updatedAt', label: 'Updated' },
  { id: 'filename', label: 'Filename' },
  { id: 'sizeBytes', label: 'Size' },
]

export const FolderDetailScreen = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()
  const queryClient = useQueryClient()

  const folderUpdateMutation = $api.useMutation(
    'put',
    '/api/v1/folders/{folderId}',
  )

  const params = useParams()
  const folderPathParts = params['*']?.split('/') ?? []
  const folderId = folderPathParts[0] ?? ''
  const { focusedFolderObject } = useFocusedFolderObjectContext()

  const [filtersAndSorting, setFiltersAndSorting] = React.useState(() => {
    return {
      filters: readFiltersFromSearchParams(searchParams, FILTER_CONFIGS),
      sorting: readSortingFromSearchParams(searchParams),
    }
  })

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

  type ViewMode = 'grid-old' | 'grid'

  const [viewMode, setViewMode] = React.useState<ViewMode>(() => {
    const viewParam = searchParams.get('view')
    return viewParam === 'grid' ? 'grid' : 'grid-old'
  })

  const handleViewModeChange = React.useCallback(
    (newViewMode: ViewMode) => {
      setViewMode(newViewMode)
      const newParams = new URLSearchParams(searchParams)
      if (newViewMode === 'grid-old') {
        newParams.delete('view')
      } else {
        newParams.set('view', newViewMode)
      }
      setSearchParams(newParams)
    },
    [searchParams, setSearchParams],
  )

  const cursorFromSearchParams = searchParams.get('cursor') ?? undefined

  const handleCursorChange = React.useCallback(
    (newCursor: string) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)
        if (newCursor === '') {
          next.delete('cursor')
        } else {
          next.set('cursor', newCursor)
        }
        return next
      })
    },
    [setSearchParams],
  )

  // Keep local UI state in sync with URL params (filters and sorting only)
  React.useEffect(() => {
    const syncedFilters = readFiltersFromSearchParams(
      searchParams,
      FILTER_CONFIGS,
    )
    const syncedSorting = readSortingFromSearchParams(searchParams)
    if (
      JSON.stringify({ filters: syncedFilters, sorting: syncedSorting }) !==
      JSON.stringify(filtersAndSorting)
    ) {
      setFiltersAndSorting({
        filters: syncedFilters,
        sorting: syncedSorting,
      })
    }
  }, [searchParams, filtersAndSorting])

  const [fetchParamsKey, updateFetchParamsKey] = React.useReducer(
    (key: number) => key + 1,
    0,
  )

  React.useEffect(() => {
    updateFetchParamsKey()
  }, [filtersAndSorting])

  const messageHandler = React.useCallback(
    (name: FolderPushMessage, _payload: unknown) => {
      if (
        [
          FolderPushMessage.OBJECTS_ADDED,
          FolderPushMessage.OBJECTS_REMOVED,
          FolderPushMessage.OBJECT_ADDED,
          FolderPushMessage.OBJECT_REMOVED,
          FolderPushMessage.OBJECT_UPDATED,
        ].includes(name)
      ) {
        void queryClient.invalidateQueries({
          queryKey: ['folders.objects', folderId],
          exact: false,
        })
      }
    },
    [queryClient, folderId],
  )
  const folderContext = useFolderContext(messageHandler)

  const reindexFolderMutation = $api.useMutation(
    'post',
    '/api/v1/folders/{folderId}/reindex',
  )

  const startFolderReindex = React.useCallback(
    (_t?: string) => {
      if (folderContext.folderMetadata) {
        void reindexFolderMutation.mutateAsync({
          params: {
            path: {
              folderId,
            },
          },
        })
      }
    },
    [folderId, folderContext.folderMetadata, reindexFolderMutation],
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
      startFolderReindex(
        folderContext.folderMetadata?.indexingJobContext
          ?.indexingContinuationKey,
      )
      setReindexFolderModalData({ isOpen: false })
    }
  }, [
    startFolderReindex,
    reindexFolderModalData,
    folderContext.folderMetadata?.indexingJobContext?.indexingContinuationKey,
  ])

  // Handle filter changes by updating URL params
  const handleFiltersChange = React.useCallback(
    (newFilters: Record<string, string[]>) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)

        // Clear existing filter params
        Object.keys(FILTER_CONFIGS).forEach((key) => {
          next.delete(key)
        })

        // Set new filter params
        Object.entries(newFilters).forEach(([key, values]) => {
          if (values.length > 0) {
            if (key === 'search') {
              const searchValue = values[0]
              if (searchValue) {
                next.set('search', searchValue)
              }
            } else {
              values.forEach((value) => {
                next.append(key, value)
              })
            }
          }
        })

        return next
      })
    },
    [setSearchParams],
  )

  // Handle sorting changes by updating URL params
  const handleSortingChange = React.useCallback(
    (newSorting: SortingState) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev)

        // Clear existing sort params
        next.delete('sort')

        // Set new sort params
        if (newSorting.length > 0) {
          const sortString = newSorting
            .map((s) => `${s.id}-${s.desc ? 'desc' : 'asc'}`)
            .join(',')
          next.set('sort', sortString)
        }

        return next
      })
    },
    [setSearchParams],
  )

  // Removed view mode switching; tiled mode is the only mode

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
    {
      enabled: folderId.length > 0,
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

  const handleFetchPage = React.useCallback(
    async (cursor: string) =>
      $apiClient
        .GET('/api/v1/folders/{folderId}/objects', {
          params: {
            path: { folderId },
            query: {
              ...(cursor.length && { cursor }),
              limit: PAGE_SIZE,
              ...(typeof filtersAndSorting.filters['search']?.[0] ===
                'string' && {
                search: filtersAndSorting.filters['search'][0],
              }),
              ...(filtersAndSorting.filters['mediaType']?.includes('IMAGE') && {
                includeImage: 'true',
              }),
              ...(filtersAndSorting.filters['mediaType']?.includes('VIDEO') && {
                includeVideo: 'true',
              }),
              ...(filtersAndSorting.filters['mediaType']?.includes('AUDIO') && {
                includeAudio: 'true',
              }),
              ...(filtersAndSorting.filters['mediaType']?.includes(
                'DOCUMENT',
              ) && {
                includeDocument: 'true',
              }),
              ...(filtersAndSorting.filters['mediaType']?.includes(
                'UNKNOWN',
              ) && {
                includeUnknown: 'true',
              }),
              ...{
                sort: (filtersAndSorting.sorting.length > 0
                  ? filtersAndSorting.sorting.map(
                      (s) => `${s.id}-${s.desc ? 'desc' : 'asc'}`,
                    )
                  : 'filename-asc') as FolderObjectsListRequest['sort'],
              },
            },
          },
        })
        .then((resp) => {
          if (isOk(resp)) {
            return resp
          }
          throw new Error(`Error received from API: ${resp.error.message}`)
        }),
    [folderId, filtersAndSorting],
  )

  const handleUpsertManyShares = React.useCallback(
    async (values: {
      shares: { userId: string; permissions: FolderPermissionName[] }[]
    }) => {
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
            '@container justify-around',
            focusedFolderObject && 'opacity-0',
          )}
        >
          <div
            className={cn(
              'flex size-full w-full flex-1 justify-between overflow-x-visible',
              sidebarOpen && 'gap-2',
            )}
          >
            <div className="flex min-w-0 flex-1 py-6">
              <div className="flex size-full flex-col gap-2">
                <div className="flex flex-col gap-4">
                  <div className="flex items-center justify-between gap-6">
                    <div className="flex items-center justify-start gap-6">
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

                      <StandaloneToolbar
                        filters={filtersAndSorting.filters}
                        filterOptions={FILTER_OPTIONS}
                        enableSearch={true}
                        searchPlaceholder="Search files..."
                        onFiltersChange={handleFiltersChange}
                        sorting={filtersAndSorting.sorting}
                        sortOptions={SORT_OPTIONS}
                        onSortingChange={handleSortingChange}
                        enableSorting={true}
                      />
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger className="flex rounded-md border p-2">
                        <Ellipsis className="size-5 shrink-0" />
                      </DropdownMenuTrigger>
                      <DropdownMenuContent>
                        <DropdownMenuItem
                          onClick={() => handleViewModeChange('grid-old')}
                          className="gap-2"
                        >
                          <List className="size-5" />
                          Grid View (Old)
                          {viewMode === 'grid-old' && (
                            <div className="ml-auto size-2 rounded-full bg-primary" />
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleViewModeChange('grid')}
                          className="gap-2"
                        >
                          <LayoutDashboard className="size-5 rotate-90" />
                          Grid View
                          {viewMode === 'grid' && (
                            <div className="ml-auto size-2 rounded-full bg-primary" />
                          )}
                        </DropdownMenuItem>

                        <DropdownMenuSeparator />
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
                </div>

                {folderContext.folderMetadata?.totalCount === 0 ? (
                  <div className="flex size-full items-center justify-center">
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
                  <div className="flex min-h-0 max-w-full flex-1 flex-col">
                    <JustifiedObjectsGrid
                      onCursorChange={handleCursorChange}
                      onFetchPage={handleFetchPage}
                      fetchParamsKey={Math.max(1, fetchParamsKey)}
                      initialPageParam={cursorFromSearchParams}
                    />
                  </div>
                )}
              </div>
            </div>
            {sidebarOpen &&
              folderContext.folder &&
              folderContext.folderPermissions && (
                <div className="flex max-w-0 overflow-x-visible @4xl:min-w-80 @4xl:max-w-[30rem] @4xl:grow">
                  <div className="size-full overflow-x-visible">
                    <FolderSidebar
                      onFolderAccessErrorCheck={async () => {
                        await $apiClient.POST(
                          '/api/v1/folders/{folderId}/check-access',
                          {
                            params: { path: { folderId } },
                          },
                        )
                        void queryClient.invalidateQueries({
                          queryKey: ['folders.objects', folderId],
                          exact: false,
                        })
                        await folderContext.refreshFolder()
                      }}
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
