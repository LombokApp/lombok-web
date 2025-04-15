import { ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { FolderObjectDTOContentMetadataValueValue } from '@stellariscloud/api-client'
import {
  FolderPermissionEnum,
  FolderPushMessage,
  MediaType,
} from '@stellariscloud/types'
import { Button, cn, TypographyH3, useToast } from '@stellariscloud/ui-toolkit'
import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

import type { DeleteObjectModalData } from '../../components/delete-object-modal/delete-object-modal'
import { DeleteObjectModal } from '../../components/delete-object-modal/delete-object-modal'
import { useLocalFileCacheContext } from '../../contexts/local-file-cache.context'
import { useFocusedFolderObjectContext } from '../../pages/folders/focused-folder-object.context'
import { useFolderContext } from '../../pages/folders/folder.context'
import { FolderObjectPreview } from '../folder-object-preview/folder-object-preview.view'
import { FolderObjectSidebar } from '../folder-object-sidebar/folder-object-sidebar.view'

export const FolderObjectDetailScreen = ({
  folderId,
  objectKey,
}: {
  folderId: string
  objectKey: string
}) => {
  const [sidebarOpen, _setSidebarOpen] = React.useState(true)
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
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      (folderObject?.hash && folderObject.contentMetadata[folderObject.hash]
        ? (folderObject.contentMetadata[folderObject.hash] ?? {})
        : {}) as Record<
        string,
        FolderObjectDTOContentMetadataValueValue | undefined
      >,
    [folderObject?.contentMetadata, folderObject?.hash],
  )

  React.useEffect(() => {
    setDisplayObjectKey(
      displaySize === 'original' || folderObject?.mediaType === MediaType.Audio
        ? `content:${objectKey}`
        : displaySize === 'compressed' &&
            folderObject?.hash &&
            currentVersionMetadata['compressedVersion']?.hash
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
      <div className="flex size-full flex-1 justify-end">
        <div
          className="relative flex size-full flex-col"
          key={displayObjectKey}
        >
          <div className="flex items-center justify-between pb-2">
            <div className="pl-2">
              <TypographyH3>{objectKey}</TypographyH3>
            </div>

            {folderObject?.objectKey && (
              <div className="px-4">
                <div className="flex gap-2">
                  {folderContext.folderPermissions?.includes(
                    FolderPermissionEnum.OBJECT_EDIT,
                  ) && (
                    <Button
                      size="sm"
                      onClick={() => setDeleteModalData({ isOpen: true })}
                      variant={'outline'}
                    >
                      <TrashIcon className="size-5" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant={'outline'}
                    onClick={handleDownload}
                  >
                    <ArrowDownTrayIcon className="size-5" />
                  </Button>
                </div>
              </div>
            )}
          </div>
          <div
            className={cn(
              'flex w-full flex-1 overflow-hidden',
              sidebarOpen && 'pr-2',
            )}
          >
            {folderObject && (
              <div className={'flex flex-1 flex-col justify-around'}>
                {folderObject.hash ? (
                  <FolderObjectPreview
                    folderId={folderId}
                    objectKey={objectKey}
                    objectMetadata={folderObject}
                    previewObjectKey={displayObjectKey}
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
          <div className="xs:w-full md:w-[1/2] lg:w-[1/2] xl:w-2/5 2xl:w-[35%] 2xl:max-w-[35rem]">
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
