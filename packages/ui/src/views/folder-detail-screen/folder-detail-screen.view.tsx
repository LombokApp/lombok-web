import type {
  FolderObjectsListRequest,
  FolderPermissionName,
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
import type { PaginationState, SortingState } from '@tanstack/table-core'
import {
  CloudUpload,
  Ellipsis,
  FileText,
  Folder,
  FolderSync,
  HelpCircle,
  Image,
  Radio,
  Share2,
  Trash,
  Video,
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
import { useServerContext } from '@/src/hooks/use-server-context'
import { useFolderContext } from '@/src/pages/folders/folder.context'
import { $api } from '@/src/services/api'
import type { DataTableFilterConfig } from '@/src/utils/tables'
import {
  convertFiltersToSearchParams,
  convertSortingToSearchParams,
  readFiltersFromSearchParams,
  readPaginationFromSearchParams,
  readSortingFromSearchParams,
} from '@/src/utils/tables'

import { FolderSidebar } from '../folder-sidebar/folder-sidebar.view'
import { folderObjectsTableColumns } from './folder-objects-table-columns'
import { FolderShareModal } from './folder-share-modal/folder-share-modal'

const FILTER_CONFIGS: Record<string, DataTableFilterConfig> = {
  search: { isSearchFilter: true },
  mediaType: { paramPrefix: 'mediaType' },
}

const protocol = window.location.protocol
const hostname = window.location.hostname
const port = window.location.port
const API_HOST = `${hostname}${port ? `:${port}` : ''}`

export const FolderDetailScreen = () => {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { toast } = useToast()

  const folderUpdateMutation = $api.useMutation(
    'put',
    '/api/v1/folders/{folderId}',
  )

  const params = useParams()
  const folderPathParts = params['*']?.split('/') ?? []
  const folderId = folderPathParts[0] ?? ''
  const focusedObjectKeyFromParams = folderPathParts[1] ?? ''

  const [filters, setFilters] = React.useState<Record<string, string[]>>(
    readFiltersFromSearchParams(searchParams, FILTER_CONFIGS),
  )
  const [sidebarOpen, _setSidebarOpen] = React.useState(true)
  const { uploadFile, uploadingProgress } = useLocalFileCacheContext()
  const serverContext = useServerContext()
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
  const [sorting, setSorting] = React.useState<SortingState>(
    readSortingFromSearchParams(searchParams),
  )
  const [pagination, setPagination] = React.useState<PaginationState>(
    readPaginationFromSearchParams(searchParams),
  )
  const searchFilterValue =
    'search' in filters ? filters['search'][0] : undefined
  const mediaTypeFilterValue = filters['mediaType'] ?? []

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
          search:
            typeof searchFilterValue === 'string'
              ? searchFilterValue
              : undefined,
          includeImage: mediaTypeFilterValue.includes('IMAGE')
            ? 'true'
            : undefined,
          includeVideo: mediaTypeFilterValue.includes('VIDEO')
            ? 'true'
            : undefined,
          includeAudio: mediaTypeFilterValue.includes('AUDIO')
            ? 'true'
            : undefined,
          includeDocument: mediaTypeFilterValue.includes('DOCUMENT')
            ? 'true'
            : undefined,
          includeUnknown: mediaTypeFilterValue.includes('UNKNOWN')
            ? 'true'
            : undefined,
          sort:
            sorting.length > 0
              ? (sorting.map(
                  (s) => `${s.id}-${s.desc ? 'desc' : 'asc'}`,
                ) as FolderObjectsListRequest['sort'])
              : undefined,
        },
      },
    },
    {
      enabled: folderId.length > 0,
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

  const handlePaginationChange = React.useCallback(
    (newPagination: PaginationState) => {
      setPagination(newPagination)
      setSearchParams({
        ...searchParams,
        page: `${newPagination.pageIndex + 1}`,
        pageSize: `${newPagination.pageSize}`,
      })
    },
    [searchParams, setSearchParams],
  )

  const handleFiltersChange = React.useCallback(
    (newFilters: Record<string, string[]>) => {
      setFilters(newFilters)
      setSearchParams(
        convertFiltersToSearchParams(newFilters, searchParams, FILTER_CONFIGS),
      )
    },
    [setSearchParams, searchParams],
  )

  const handleSortingChange = React.useCallback(
    (newSorting: SortingState) => {
      setSorting(newSorting)
      const newParams = convertSortingToSearchParams(newSorting, searchParams)
      setSearchParams(newParams)
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
            '@container justify-around',
            focusedObjectKeyFromParams && 'opacity-0',
          )}
        >
          {/* eslint-disable-next-line tailwindcss/no-unnecessary-arbitrary-value */}
          <div className="flex size-full w-full flex-1 justify-between overflow-x-visible @4xl:flex-none @4xl:gap-4 @8xl:w-[90%] @9xl:w-[85%] @10xl:w-4/5 @11xl:w-[75%] @12xl:w-[70%] @13xl:w-[65%] @15xl:w-[90rem]">
            <div className="flex min-w-0 flex-1 py-6">
              <div className="flex size-full flex-col gap-2">
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
                      {serverContext.folderActionMenuLinkContributions.map(
                        (linkContribution) => (
                          <DropdownMenuItem
                            key={linkContribution.href}
                            onClick={() =>
                              void navigate(
                                linkContribution.href.replace(
                                  '{folderId}',
                                  folderId,
                                ),
                              )
                            }
                            className="gap-2"
                          >
                            <img
                              src={`${protocol}//${linkContribution.uiIdentifier}.${linkContribution.appIdentifier}.apps.${API_HOST}${linkContribution.iconPath}`}
                              alt={`${linkContribution.appLabel} icon`}
                              className="size-4"
                            />
                            {linkContribution.label}
                          </DropdownMenuItem>
                        ),
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
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
                    <DataTable
                      fixedLayout={true}
                      cellPadding={'p-1.5'}
                      hideHeader={true}
                      enableSearch={true}
                      filters={filters}
                      sorting={sorting}
                      onColumnFiltersChange={handleFiltersChange}
                      rowCount={
                        listFolderObjectsQuery.data?.meta.totalCount ?? 0
                      }
                      data={listFolderObjectsQuery.data?.result ?? []}
                      columns={folderObjectsTableColumns}
                      onPaginationChange={handlePaginationChange}
                      pagination={pagination}
                      onSortingChange={handleSortingChange}
                      filterOptions={{
                        mediaType: {
                          label: 'Media Type',
                          options: [
                            {
                              value: 'IMAGE',
                              label: 'Images',
                              icon: Image,
                            },
                            {
                              value: 'VIDEO',
                              label: 'Videos',
                              icon: Video,
                            },
                            { value: 'AUDIO', label: 'Audio', icon: Radio },
                            {
                              value: 'DOCUMENT',
                              label: 'Documents',
                              icon: FileText,
                            },
                            {
                              value: 'UNKNOWN',
                              label: 'Unknown',
                              icon: HelpCircle,
                            },
                          ],
                        },
                      }}
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
