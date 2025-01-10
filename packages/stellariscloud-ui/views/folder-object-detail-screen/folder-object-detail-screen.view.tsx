import { ArrowDownTrayIcon, TrashIcon } from '@heroicons/react/24/outline'
import type { FolderObjectDTO } from '@stellariscloud/api-client'
import {
  FolderPermissionEnum,
  FolderPushMessage,
  MediaType,
} from '@stellariscloud/types'
import { Button, ButtonGroup } from '@stellariscloud/ui-toolkit'
import { ArrowLeft, ArrowRight } from 'lucide-react'
import React from 'react'

import { ConfirmDeleteModal } from '../../components/confirm-delete-modal/confirm-delete-modal'
import { useFolderContext } from '../../contexts/folder.context'
import { useLocalFileCacheContext } from '../../contexts/local-file-cache.context'
import { LogLevel, useLoggingContext } from '../../contexts/logging.context'
import { apiClient } from '../../services/api'
import { FolderObjectPreview } from '../folder-object-preview/folder-object-preview.view'
import { FolderObjectSidebar } from '../folder-object-sidebar/folder-object-sidebar.view'

export const FolderObjectDetailScreen = ({
  folderId,
  objectKey,
  onFolderLinkClick,
  onNextClick,
  onPreviousClick,
}: {
  folderId: string
  objectKey: string
  onFolderLinkClick: () => void
  onNextClick?: () => void
  onPreviousClick?: () => void
}) => {
  const [sidebarOpen, _setSidebarOpen] = React.useState(true)
  const [showDeleteModal, setShowDeleteModal] = React.useState(false)
  const [folderObject, setFolderObject] = React.useState<FolderObjectDTO>()
  const logging = useLoggingContext()
  const [displaySize, setDisplaySize] = React.useState('compressed')
  const [displayObjectKey, setDisplayObjectKey] = React.useState<string>()
  const { downloadToFile } = useLocalFileCacheContext()

  const currentVersionMetadata = React.useMemo(
    () =>
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
      folderObject?.hash && folderObject.contentMetadata[folderObject.hash]
        ? (folderObject.contentMetadata[folderObject.hash] ?? {})
        : {},
    [folderObject?.contentMetadata, folderObject?.hash],
  )

  React.useEffect(() => {
    setDisplayObjectKey(
      displaySize === 'original' || folderObject?.mediaType === MediaType.Audio
        ? `content:${objectKey}`
        : displaySize === 'compressed' &&
            folderObject?.hash &&
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

  const fetchKeyMetadata = React.useCallback(() => {
    void apiClient.foldersApi
      .getFolderObject({ folderId, objectKey })
      .then((response) => setFolderObject(response.data.folderObject))
  }, [folderId, objectKey])

  const handleIndexFolderObject = () => {
    // void apiClient.foldersApi.rescanFolderObject({
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
        setFolderObject(payload as FolderObjectDTO)
      }
    },
    [objectKey],
  )
  const folderContext = useFolderContext(messageHandler)

  const handleFolderLinkClick = React.useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault()
      e?.stopPropagation()
      onFolderLinkClick()
    },
    [onFolderLinkClick],
  )

  const handleDelete = () => {
    if (!showDeleteModal) {
      setShowDeleteModal(true)
    } else {
      void apiClient.foldersApi
        .deleteFolderObject({ folderId, objectKey })
        .then(() => {
          logging.appendLogLine({
            level: LogLevel.INFO,
            message: `Deleted object ${objectKey}`,
            folderId,
            remote: false,
            objectKey,
          })
          handleFolderLinkClick()
        })
    }
  }

  React.useEffect(() => {
    fetchKeyMetadata()
  }, [fetchKeyMetadata])

  return (
    <>
      {showDeleteModal && folderObject && (
        <ConfirmDeleteModal
          folderObject={folderObject}
          onConfirm={handleDelete}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}
      <div className="flex size-full flex-1 justify-end">
        <div
          className="relative flex size-full flex-col items-center"
          key={displayObjectKey}
        >
          {folderObject?.objectKey && (
            <div className="w-full px-4 py-2">
              <div className="flex gap-2 pt-2">
                {folderContext.folderPermissions?.includes(
                  FolderPermissionEnum.OBJECT_EDIT,
                ) && (
                  <Button
                    size="sm"
                    onClick={handleDelete}
                    variant={'destructive'}
                  >
                    <TrashIcon className="size-5" />
                    Delete
                  </Button>
                )}
                <Button
                  size="sm"
                  onClick={() =>
                    downloadToFile(
                      folderId,
                      `content:${objectKey}`,
                      objectKey.split('/').at(-1) ?? objectKey,
                    )
                  }
                >
                  <ArrowDownTrayIcon className="size-5" />
                  Download
                </Button>
                <ButtonGroup>
                  <Button
                    onClick={() => {
                      onNextClick?.()
                      setDisplayObjectKey(undefined)
                    }}
                  >
                    <ArrowLeft />
                  </Button>
                  <Button
                    onClick={() => {
                      onPreviousClick?.()
                      setDisplayObjectKey(undefined)
                    }}
                  >
                    <ArrowRight />
                  </Button>
                </ButtonGroup>
              </div>
            </div>
          )}
          <div className="flex w-full flex-1 overflow-hidden">
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
        </div>
      </div>
    </>
  )
}
