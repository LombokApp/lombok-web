import {
  ArrowLeftIcon,
  ArrowRightIcon,
  FolderIcon,
} from '@heroicons/react/24/outline'
import type {
  FolderObjectData,
  ObjectTagData,
} from '@stellariscloud/api-client'
import { MediaType } from '@stellariscloud/api-client'
import { Button, Icon } from '@stellariscloud/design-system'
import { mediaTypeFromMimeType } from '@stellariscloud/utils'
import Link from 'next/link'
import type { Router } from 'next/router'
import { withRouter } from 'next/router'
import React from 'react'

import { ConfirmDelete } from '../../components/confirm-delete/confirm-delete'
import { FolderObjectDetailSidePanel } from '../../components/folder-object-detail-side-panel/folder-object-detail-side-panel'
import { Takeover } from '../../components/takeover/takeover'
import { useFolderContext } from '../../contexts/folder.context'
import { useLocalFileCacheContext } from '../../contexts/local-file-cache.context'
import { LogLevel, useLoggingContext } from '../../contexts/logging.context'
import { foldersApi } from '../../services/api'
import { OBJECT_DETAIL_FORCE_DOWNLOAD_SIZE_THRESHOLD } from '../../utils/constants'
import { FolderObjectPreview } from '../folder-object-preview/folder-object-preview.view'

export const FolderObjectDetailScreen = withRouter(
  ({
    folderId,
    objectKey,
    router,
    onFolderLinkClick,
    onNextClick,
    onPreviousClick,
  }: {
    router: Router
    folderId: string
    objectKey: string
    onFolderLinkClick: () => void
    onNextClick?: () => void
    onPreviousClick?: () => void
  }) => {
    const folderContext = useFolderContext()
    const [showDeleteModal, setShowDeleteModal] = React.useState(false)
    const [folderObject, setFolderObject] = React.useState<FolderObjectData>()

    const logging = useLoggingContext()
    const [displaySize, setDisplaySize] = React.useState<string>('large')
    const { regenerateObjectPreviews, downloadToFile } =
      useLocalFileCacheContext()
    const handleEdit = () => {
      void router.push(
        `/folders/${folderId}/${encodeURIComponent(objectKey)}/edit`,
      )
    }
    const previews = folderObject?.contentMetadata?.previews ?? {}
    const previewObjectKey =
      displaySize === 'original'
        ? objectKey
        : displaySize in previews
        ? `${objectKey}____previews/${
            previews[displaySize as keyof typeof previews]?.path
          }`
        : folderObject &&
          folderObject.sizeBytes <= OBJECT_DETAIL_FORCE_DOWNLOAD_SIZE_THRESHOLD
        ? objectKey
        : undefined

    React.useEffect(() => {
      setDisplaySize(
        (folderObject?.sizeBytes ?? 0) > 0 &&
          (folderObject?.sizeBytes ?? 0) < 250 * 1000
          ? 'original'
          : 'large',
      )
    }, [folderObject?.sizeBytes])

    const fetchKeyMetadata = React.useCallback(() => {
      void foldersApi
        .getFolderObject({ folderId, objectKey })
        .then((response) => setFolderObject(response.data))
    }, [folderId, objectKey])

    const handleReindex = () => {
      void regenerateObjectPreviews(folderId, objectKey).then(() =>
        fetchKeyMetadata(),
      )
    }

    const handleCreateTag = (name: string) => {
      return foldersApi
        .createTag({ folderId, inlineObject2: { name } })
        .then((response) => {
          void folderContext.refreshTags()
          return response.data
        })
    }

    const handleTagObject = React.useCallback(
      (tagId: string) =>
        foldersApi
          .tagObject({ folderId, objectKey, tagId })
          .then(fetchKeyMetadata),
      [folderId, objectKey, fetchKeyMetadata],
    )

    const handleUntagObject = React.useCallback(
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

    const handleShare = () => {
      void router.push({
        pathname: `/share`,
        query: {
          objects: [`${folderId}:${objectKey}`],
        },
      })
    }

    React.useEffect(() => {
      fetchKeyMetadata()
    }, [fetchKeyMetadata])

    const mediaType = folderObject?.contentMetadata
      ? mediaTypeFromMimeType(folderObject.contentMetadata.mimeType)
      : undefined

    return (
      <>
        {showDeleteModal && folderObject && (
          <Takeover>
            <div className="h-screen w-screen bg-black/[.75] flex flex-col justify-around items-center">
              <ConfirmDelete
                folderObject={folderObject}
                onConfirm={handleDelete}
                onCancel={() => setShowDeleteModal(false)}
              />
            </div>
          </Takeover>
        )}
        <div className="w-full h-full flex flex-1 justify-end bg-black">
          {folderContext.folder && (
            <div className="absolute top-4 z-50 left-5">
              <Link
                href={`/folders/${folderId}`}
                onClick={handleFolderLinkClick}
              >
                <div className="rounded-full bg-gray-50/[.2] hover:bg-gray-50/[.15] p-6 py-3">
                  <div className="flex gap-4 items-center">
                    <Icon icon={FolderIcon} size={'md'} />
                    <div className="opacity-50 text-sm">
                      {folderContext.folder.name}
                    </div>
                  </div>
                </div>
              </Link>
            </div>
          )}

          <div
            className="relative h-full w-full flex flex-col items-center justify-around"
            key={previewObjectKey}
          >
            {(onPreviousClick || onNextClick) && (
              <div className="absolute top-4 z-50 right-5">
                <div className="flex gap-4">
                  {onPreviousClick && (
                    <Button
                      variant={'link'}
                      onClick={onPreviousClick}
                      className="p-0 text-white"
                    >
                      <Icon
                        icon={ArrowLeftIcon}
                        size={'lg'}
                        className={`bg-gray-50/[.2] rounded-full py-3`}
                      />
                    </Button>
                  )}
                  {onNextClick && (
                    <Button
                      variant={'link'}
                      onClick={onNextClick}
                      className="p-0 text-white"
                    >
                      <Icon
                        icon={ArrowRightIcon}
                        size={'lg'}
                        className={`bg-gray-50/[.2] rounded-full py-3`}
                      />
                    </Button>
                  )}
                </div>
              </div>
            )}
            {!previewObjectKey &&
              folderObject?.contentMetadata &&
              mediaType &&
              [MediaType.Image, MediaType.Video].includes(mediaType) && (
                <Button onClick={handleReindex} variant="primary">
                  Reindex content
                </Button>
              )}
            {folderObject && (
              <FolderObjectPreview
                folderId={folderId}
                objectKey={objectKey}
                objectMetadata={folderObject}
                previewObjectKey={previewObjectKey}
              />
            )}
          </div>
          <div className="h-full max-w-[40rem]">
            <FolderObjectDetailSidePanel
              displaySize={displaySize}
              previews={folderObject?.contentMetadata?.previews}
              onEdit={handleEdit}
              onFolderRefresh={handleReindex}
              onDelete={handleDelete}
              onShare={handleShare}
              onCreateTag={handleCreateTag}
              onTagObject={handleTagObject}
              onUntagObject={handleUntagObject}
              tags={folderContext.tags}
              objectTags={
                (folderObject?.tags ?? [])
                  .map((tagId) =>
                    folderContext.tags?.find((t) => t.id === tagId),
                  )
                  .filter((t) => !!t) as ObjectTagData[]
              }
              onDisplaySizeChange={(s) => setDisplaySize(s)}
              onDownload={() => downloadToFile(folderId, objectKey)}
              folderAndPermission={
                folderContext.folder &&
                folderContext.folderPermissions && {
                  folder: folderContext.folder,
                  permissions: folderContext.folderPermissions,
                }
              }
              objectKey={objectKey}
              fileObject={folderObject}
              fileObjectMetadata={folderObject?.contentMetadata}
            />
          </div>
        </div>
      </>
    )
  },
)
