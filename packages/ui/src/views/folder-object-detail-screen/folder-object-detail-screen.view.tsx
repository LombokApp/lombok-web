import type { ContentMetadataEntry } from '@lombokapp/types'
import {
  FolderPermissionEnum,
  FolderPushMessage,
  MediaType,
} from '@lombokapp/types'
import {
  Button,
  cn,
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TypographyH3,
  useToast,
} from '@lombokapp/ui-toolkit'
import { Download, Trash } from 'lucide-react'
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import { useServerContext } from '@/src/hooks/use-server-context'

import type { DeleteObjectModalData } from '../../components/delete-object-modal/delete-object-modal'
import { DeleteObjectModal } from '../../components/delete-object-modal/delete-object-modal'
import { useLocalFileCacheContext } from '../../contexts/local-file-cache.context'
import { useFocusedFolderObjectContext } from '../../pages/folders/focused-folder-object.context'
import { useFolderContext } from '../../pages/folders/folder.context'
import { FolderObjectPreview } from '../folder-object-preview/folder-object-preview.view'
import { FolderObjectSidebar } from '../folder-object-sidebar/folder-object-sidebar.view'

const protocol = window.location.protocol
const hostname = window.location.hostname
const port = window.location.port
const API_HOST = `${hostname}${port ? `:${port}` : ''}`

export const FolderObjectDetailScreen = ({
  folderId,
  objectKey,
}: {
  folderId: string
  objectKey: string
}) => {
  const [sidebarOpen, _setSidebarOpen] = React.useState(true)
  const serverContext = useServerContext()
  const { focusedFolderObject: folderObject, refetch: refetchFolderObject } =
    useFocusedFolderObjectContext()
  const [displaySize, setDisplaySize] = React.useState('compressed')
  const [displayObjectKey, setDisplayObjectKey] = React.useState<string>()
  const { downloadToFile } = useLocalFileCacheContext()
  const [deleteModalData, setDeleteModalData] =
    React.useState<DeleteObjectModalData>({
      isOpen: false,
    })

  const { toast } = useToast()
  const handleDownload = React.useCallback(() => {
    toast({ title: 'Preparing download' })
    downloadToFile(
      folderId,
      `content:${objectKey}`,
      objectKey.split('/').at(-1) ?? objectKey,
    )
  }, [downloadToFile, folderId, objectKey, toast])

  const currentVersionMetadata = React.useMemo(
    () =>
      (folderObject?.hash && folderObject.contentMetadata[folderObject.hash]
        ? (folderObject.contentMetadata[folderObject.hash] ?? {})
        : {}) as Record<string, ContentMetadataEntry | undefined>,
    [folderObject?.contentMetadata, folderObject?.hash],
  )

  React.useEffect(() => {
    setDisplayObjectKey(
      displaySize === 'original' ||
        folderObject?.mediaType === MediaType.Audio ||
        folderObject?.mediaType === MediaType.Document
        ? `content:${objectKey}`
        : displaySize === 'compressed' &&
            folderObject?.hash &&
            currentVersionMetadata['compressedVersion']?.type === 'external' &&
            currentVersionMetadata['compressedVersion'].hash
          ? `metadata:${objectKey}:${currentVersionMetadata['compressedVersion'].hash}`
          : undefined,
    )
  }, [
    displaySize,
    currentVersionMetadata,
    folderObject?.hash,
    folderObject?.mediaType,
    objectKey,
  ])

  React.useEffect(() => {
    setDisplaySize(
      (folderObject?.sizeBytes ?? 0) > 0 &&
        (folderObject?.sizeBytes ?? 0) < 250 * 1000
        ? 'original'
        : 'compressed',
    )
  }, [folderObject?.sizeBytes])

  const handleIndexFolderObject = () => {
    // void apiClient.foldersApi.reindexFolderObject({
    //   folderId,
    //   folderOperationRequestPayload: {
    //     operationName: FolderOperationName.IndexFolderObject,
    //     operationData: {
    //       folderId,
    //       objectKey,
    //     },
    //   },
    // })
  }

  const messageHandler = React.useCallback(
    (name: FolderPushMessage, payload: unknown) => {
      if (
        [
          FolderPushMessage.OBJECT_UPDATED,
          FolderPushMessage.OBJECTS_REMOVED,
        ].includes(name) &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access
        (payload as any).objectKey === objectKey
      ) {
        void refetchFolderObject()
      }
    },
    [refetchFolderObject, objectKey],
  )
  const folderContext = useFolderContext(messageHandler)
  const navigate = useNavigate()
  const location = useLocation()

  const handleFolderLinkClick = React.useCallback(() => {
    const folderPath = `/folders/${folderId}`

    // Check if we just came from the parent folder view
    if (location.pathname.startsWith(folderPath) && location.key) {
      // If we have a browser history key, we can go back
      void navigate(-1)
    } else {
      // Otherwise navigate directly to the folder view
      void navigate(folderPath)
    }
  }, [navigate, location, folderId])

  const handleDelete = async () => {
    if (!folderObject) {
      return
    }

    if (
      folderContext.folderPermissions?.includes(
        FolderPermissionEnum.OBJECT_EDIT,
      )
    ) {
      try {
        await folderContext.deleteFolderObject(folderObject.objectKey)
        handleFolderLinkClick()
      } catch (error) {
        console.error('Error deleting object:', error)
      }
    }
  }

  return (
    <>
      <DeleteObjectModal
        modalData={{
          ...deleteModalData,
          folderObject,
        }}
        setModalData={setDeleteModalData}
        onConfirm={handleDelete}
      />
      <div className="flex size-full flex-1 justify-between overflow-x-visible">
        <div
          className="flex max-w-full flex-col py-6 lg:w-1/2 xl:flex-1"
          key={displayObjectKey}
        >
          <div className="flex items-start justify-between pb-2 pr-0 lg:pr-4">
            <div className="pl-2">
              <TypographyH3>{objectKey}</TypographyH3>
            </div>

            {folderObject?.objectKey && (
              <div className="pl-2">
                <div className="flex gap-2">
                  {folderContext.folderPermissions?.includes(
                    FolderPermissionEnum.OBJECT_EDIT,
                  ) && (
                    <TooltipProvider>
                      <Tooltip delayDuration={100}>
                        <TooltipTrigger asChild>
                          <Button
                            size="sm"
                            onClick={() => setDeleteModalData({ isOpen: true })}
                            variant={'outline'}
                          >
                            <Trash className="size-5" />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">Delete</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  )}
                  <TooltipProvider>
                    <Tooltip delayDuration={100}>
                      <TooltipTrigger asChild>
                        <Button
                          size="sm"
                          variant={'outline'}
                          onClick={handleDownload}
                        >
                          <Download className="size-5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent side="bottom">Download</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                  {serverContext.objectActionMenuLinkContributions.map(
                    (linkContribution) => (
                      <TooltipProvider key={linkContribution.href}>
                        <Tooltip delayDuration={100}>
                          <TooltipTrigger asChild>
                            <Button
                              className="px-1"
                              size="sm"
                              variant={'outline'}
                              onClick={() =>
                                void navigate(
                                  linkContribution.href
                                    .replace('{folderId}', folderId)
                                    .replace('{objectKey}', objectKey),
                                )
                              }
                            >
                              <img
                                src={`${protocol}//${linkContribution.uiIdentifier}.${linkContribution.appIdentifier}.apps.${API_HOST}${linkContribution.iconPath}`}
                                alt={`${linkContribution.appLabel} icon`}
                                className="size-6"
                              />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="bottom">
                            {linkContribution.label}
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    ),
                  )}
                </div>
              </div>
            )}
          </div>
          <div
            className={cn(
              'flex w-full flex-1 overflow-hidden',
              sidebarOpen && 'pr-0 lg:pr-4',
            )}
          >
            {folderObject && (
              <div className={'flex max-w-full flex-1 flex-col justify-around'}>
                {folderObject.hash ? (
                  <FolderObjectPreview
                    folderId={folderId}
                    objectKey={objectKey}
                    objectMetadata={folderObject}
                    previewObjectKey={displayObjectKey}
                    displayMode="object-scale-down"
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-around">
                    <Button onClick={handleIndexFolderObject}>
                      Analyze content
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
        {sidebarOpen && folderObject && folderContext.folder && (
          <div className="xs:w-0 max-w-[40rem] overflow-x-visible lg:w-1/2 xl:w-1/3">
            <FolderObjectSidebar
              folderAndPermission={
                folderContext.folderPermissions && {
                  folder: folderContext.folder,
                  permissions: folderContext.folderPermissions,
                }
              }
              folder={folderContext.folder}
              objectKey={objectKey}
              folderObject={folderObject}
            />
          </div>
        )}
      </div>
    </>
  )
}
