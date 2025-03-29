import type { FolderObjectDTO } from '@stellariscloud/api-client'
import { MediaType } from '@stellariscloud/types'
import { cn } from '@stellariscloud/ui-toolkit'
import {
  mediaTypeFromExtension,
  mediaTypeFromMimeType,
} from '@stellariscloud/utils'
import React from 'react'

import { AudioPlayer } from '../../components/audio-player/audio-player'
import { VideoPlayer } from '../../components/video-player/video-player'
import { useLocalFileCacheContext } from '../../contexts/local-file-cache.context'
import { Icon } from '../../design-system/icon'
import { apiClient } from '../../services/api'
import { iconForMediaType } from '../../utils/icons'

export const FolderObjectPreview = ({
  folderId,
  objectKey,
  previewObjectKey,
  displayMode = 'object-contain',
  objectMetadata,
}: {
  folderId: string
  objectKey: string
  objectMetadata?: FolderObjectDTO
  previewObjectKey: string | undefined
  displayMode?: string
}) => {
  const [folderObject, setFolderObject] = React.useState<
    FolderObjectDTO | undefined
  >(objectMetadata)
  const fileName = objectKey.split('/').at(-1)
  const [file, setFile] = React.useState<
    | {
        previewObjectKey: string
        dataURL: string
        type: string
      }
    | false
  >()
  const { getData } = useLocalFileCacheContext()

  React.useEffect(() => {
    if (folderId && objectKey && !folderObject) {
      void apiClient.foldersApi
        .getFolderObject({ folderId, objectKey })
        .then((response) => {
          setFolderObject(response.data.folderObject)
        })
    }
  }, [folderId, objectKey, folderObject])

  React.useEffect(() => {
    if (!file && previewObjectKey) {
      void getData(folderId, previewObjectKey).then((f) => {
        if (f) {
          setFile({ previewObjectKey, dataURL: f.dataURL, type: f.type })
        }
      })
    }
  }, [file, folderId, getData, previewObjectKey])

  if (file === undefined) {
    return null
  }

  const contentAttributes =
    folderObject?.hash && folderObject.hash in folderObject.contentAttributes
      ? folderObject.contentAttributes[folderObject.hash]
      : undefined

  const mimeType =
    folderObject?.hash && contentAttributes
      ? contentAttributes.mimeType
      : undefined

  const dataURL = file === false ? undefined : file.dataURL
  const mediaType = mimeType
    ? mediaTypeFromMimeType(mimeType)
    : mediaTypeFromExtension(folderObject?.objectKey.split('.').at(-1) ?? '')

  const isCoverView = displayMode === 'object-cover'
  return (
    <div
      className={cn(
        'flex justify-center size-full bg-foreground/[.03] rounded-md',
      )}
    >
      <div className={cn('flex justify-center', isCoverView && 'size-full')}>
        {file && dataURL && mediaType === MediaType.Image ? (
          <div className={cn('flex-1 flex flex-col justify-around')}>
            <img
              className={cn(displayMode, isCoverView ? 'size-full' : '')}
              alt={fileName ?? objectKey}
              src={dataURL}
            />
          </div>
        ) : file && dataURL && mediaType === MediaType.Video ? (
          <div className="flex h-full justify-center">
            <VideoPlayer
              className={displayMode}
              width="100%"
              height="100%"
              controls
              src={dataURL}
            />
          </div>
        ) : file && dataURL && mediaType === MediaType.Audio ? (
          <div className="flex size-full items-center justify-center p-4">
            <div className="sm:size-full lg:size-4/5 xl:size-3/5">
              <AudioPlayer width="100%" height="100%" controls src={dataURL} />
            </div>
          </div>
        ) : (
          <div className="flex size-full flex-col items-center justify-around bg-black text-white">
            <Icon size={'xl'} icon={iconForMediaType(mediaType)} />
          </div>
        )}
      </div>
    </div>
  )
}
