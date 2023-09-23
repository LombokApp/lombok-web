import {
  ArrowDownTrayIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  CubeIcon,
  DocumentIcon,
  FolderIcon,
  HashtagIcon,
  MapPinIcon,
  QuestionMarkCircleIcon,
  TrashIcon,
} from '@heroicons/react/24/outline'
import type { FolderObjectData } from '@stellariscloud/api-client'
import {
  FolderOperationName,
  FolderPermissionName,
} from '@stellariscloud/api-client'
import { FolderPushMessage } from '@stellariscloud/types'
import { formatBytes, toMetadataObjectIdentifier } from '@stellariscloud/utils'
import { useRouter } from 'next/router'
import React from 'react'

import { ConfirmDelete } from '../../components/confirm-delete/confirm-delete'
import { Takeover } from '../../components/takeover/takeover'
import { useFolderContext } from '../../contexts/folder.context'
import { useLocalFileCacheContext } from '../../contexts/local-file-cache.context'
import { LogLevel, useLoggingContext } from '../../contexts/logging.context'
import { Button } from '../../design-system/button/button'
import { ButtonGroup } from '../../design-system/button-group/button-group'
import { Icon } from '../../design-system/icon'
import { PageHeading } from '../../design-system/page-heading/page-heading'
import { foldersApi } from '../../services/api'
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
  const [folderObject, setFolderObject] = React.useState<FolderObjectData>()
  const logging = useLoggingContext()
  const [displaySize, setDisplaySize] = React.useState('compressed')
  const [displayObjectKey, setDisplayObjectKey] = React.useState<string>()
  const { downloadToFile } = useLocalFileCacheContext()

  const currentVersionMetadata = React.useMemo(
    () =>
      folderObject?.hash && folderObject.contentMetadata[folderObject.hash]
        ? folderObject.contentMetadata[folderObject.hash] ?? {}
        : {},
    [folderObject?.contentMetadata, folderObject?.hash],
  )

  React.useEffect(() => {
    setDisplayObjectKey(
      displaySize === 'original'
        ? `content:${objectKey}`
        : displaySize === 'compressed' &&
          folderObject?.hash &&
          currentVersionMetadata['compressedVersion']?.hash
        ? `metadata:${objectKey}:${currentVersionMetadata['compressedVersion'].hash}`
        : undefined,
    )
  }, [displaySize, currentVersionMetadata, folderObject?.hash, objectKey])

  React.useEffect(() => {
    setDisplaySize(
      (folderObject?.sizeBytes ?? 0) > 0 &&
        (folderObject?.sizeBytes ?? 0) < 250 * 1000
        ? 'original'
        : 'compressed',
    )
  }, [folderObject?.sizeBytes])

  const { getData } = useLocalFileCacheContext()

  const fetchKeyMetadata = React.useCallback(() => {
    void foldersApi
      .getFolderObject({ folderId, objectKey })
      .then((response) => setFolderObject(response.data))
  }, [folderId, objectKey])

  const handleIndexFolderObject = () => {
    void foldersApi.enqueueFolderOperation({
      folderId,
      folderOperationRequestPayload: {
        operationName: FolderOperationName.IndexFolderObject,
        operationData: {
          folderId,
          objectKey,
        },
      },
    })
  }

  const _handleTranscribe = () => {
    void foldersApi.enqueueFolderOperation({
      folderId,
      folderOperationRequestPayload: {
        operationName: FolderOperationName.TranscribeAudio,
        operationData: {
          folderId,
          objectKey,
        },
      },
    })
  }

  const _handleDetectObjects = () => {
    void foldersApi.enqueueFolderOperation({
      folderId,
      folderOperationRequestPayload: {
        operationName: FolderOperationName.DetectObjects,
        operationData: {
          folderId,
          objectKey,
        },
      },
    })
  }

  const messageHandler = React.useCallback(
    (name: FolderPushMessage, payload: { [key: string]: any }) => {
      if (
        [
          FolderPushMessage.OBJECT_UPDATED,
          FolderPushMessage.OBJECTS_REMOVED,
        ].includes(name) &&
        payload.objectKey === objectKey
      ) {
        setFolderObject(payload as FolderObjectData)
      }
    },
    [objectKey],
  )
  const folderContext = useFolderContext(messageHandler)

  const _handleCreateTag = React.useCallback(
    (name: string) =>
      foldersApi
        .createTag({ folderId, createTagRequest: { name } })
        .then((response) => {
          void folderContext.refreshTags()
          return response.data
        }),
    [folderContext, folderId],
  )

  const _handleTagObject = React.useCallback(
    (tagId: string) =>
      foldersApi
        .tagObject({ folderId, objectKey, tagId })
        .then(fetchKeyMetadata),
    [folderId, objectKey, fetchKeyMetadata],
  )

  const _handleUntagObject = React.useCallback(
    (tagId: string) =>
      foldersApi
        .untagObject({ folderId, objectKey, tagId })
        .then(fetchKeyMetadata),
    [folderId, objectKey, fetchKeyMetadata],
  )

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
      void foldersApi.deleteFolderObject({ folderId, objectKey }).then(() => {
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

  const router = useRouter()
  const [objectThumbnailData, setObjectThumbnailData] = React.useState<string>()

  React.useEffect(() => {
    if (
      folderObject?.hash &&
      folderObject.contentMetadata[folderObject.hash]?.thumbnailSm?.hash
    ) {
      const metadataObjectIdentifier = toMetadataObjectIdentifier(
        objectKey,
        folderObject.contentMetadata[folderObject.hash]?.thumbnailSm?.hash ??
          '',
      )
      void getData(folderId, metadataObjectIdentifier).then((data) => {
        setObjectThumbnailData(data?.dataURL)
      })
    }
  }, [folderId, folderObject, getData, objectKey])

  return (
    <>
      {showDeleteModal && folderObject && (
        <Takeover>
          <div className="h-screen w-screen flex flex-col justify-around items-center">
            <ConfirmDelete
              folderObject={folderObject}
              onConfirm={handleDelete}
              onCancel={() => setShowDeleteModal(false)}
            />
          </div>
        </Takeover>
      )}
      <div className="w-full h-screen flex flex-1 justify-end bg-gray-50 dark:bg-gray-900">
        <div
          className="relative w-full flex flex-col items-center"
          key={displayObjectKey}
        >
          {folderObject && (
            <div className="w-full flex-0 px-4 py-2">
              <PageHeading
                title={folderObject.objectKey}
                titleIcon={DocumentIcon}
                titleIconBg={'bg-purple-500 dark:bg-purple-700'}
                titleIconSrc={objectThumbnailData}
                ancestorTitle={folderContext.folder?.name}
                ancestorHref={`/folders/${folderObject.folder.id}`}
                ancestorTitleIcon={FolderIcon}
                ancestorTitleIconBg="bg-blue-500"
                onAncestorPress={(href) => void router.push(href)}
                properties={[
                  {
                    icon: CubeIcon,
                    value: formatBytes(folderObject.sizeBytes),
                  },
                  {
                    icon: QuestionMarkCircleIcon,
                    value: folderObject.mimeType,
                  },
                  ...(folderObject.hash
                    ? [
                        {
                          icon: HashtagIcon,
                          value: folderObject.hash.slice(0, 8),
                          monospace: true,
                        },
                      ]
                    : []),
                  ...(folderContext.folder
                    ? [
                        {
                          icon: MapPinIcon,
                          value: `${folderContext.folder.endpoint}/${folderContext.folder.bucket}/${folderObject.objectKey}`,
                        },
                      ]
                    : []),
                ]}
              >
                <div className="pt-2 flex gap-2">
                  {folderContext.folderPermissions?.includes(
                    FolderPermissionName.ObjectEdit,
                  ) && (
                    <Button
                      size="sm"
                      onClick={handleDelete}
                      danger
                      icon={TrashIcon}
                    >
                      Delete
                    </Button>
                  )}
                  <Button
                    size="sm"
                    primary
                    onClick={() =>
                      downloadToFile(
                        folderId,
                        `content:${folderObject.objectKey}`,
                        objectKey.split('/').at(-1) ?? folderObject.objectKey,
                      )
                    }
                  >
                    <Icon
                      size="sm"
                      icon={ArrowDownTrayIcon}
                      className="text-white"
                    />
                    Download
                  </Button>
                  <ButtonGroup
                    size="lg"
                    buttons={
                      onNextClick && onPreviousClick
                        ? [
                            {
                              name: '',
                              icon: ArrowLeftIcon,
                              disabled: false,
                              onClick: () => {
                                onNextClick()
                                setDisplayObjectKey(undefined)
                              },
                            },
                            {
                              name: '',
                              icon: ArrowRightIcon,
                              disabled: false,
                              onClick: () => {
                                onPreviousClick()
                                setDisplayObjectKey(undefined)
                              },
                            },
                          ]
                        : []
                    }
                  />
                </div>
              </PageHeading>
            </div>
          )}
          <div className="w-full flex-1 flex">
            {folderObject && (
              <div
                className={
                  'h-full flex-1 bg-gray-100 dark:bg-black/[20%] flex flex-col'
                }
              >
                {folderObject.hash ? (
                  <FolderObjectPreview
                    folderId={folderId}
                    objectKey={objectKey}
                    objectMetadata={folderObject}
                    previewObjectKey={displayObjectKey}
                  />
                ) : (
                  <div className="flex flex-1 items-center justify-around">
                    <Button onClick={handleIndexFolderObject} primary>
                      Reindex content
                    </Button>
                  </div>
                )}
              </div>
            )}
            {sidebarOpen && folderObject && folderContext.folder && (
              <div className="xs:w-[100%] md:w-[50%] lg:w-[50%] xl:w-[40%] 2xl:w-[35%] 2xl:max-w-[35rem]">
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
