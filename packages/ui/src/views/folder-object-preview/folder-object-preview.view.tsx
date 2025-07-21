import type { FolderObjectDTO } from '@stellariscloud/types'
import { MediaType } from '@stellariscloud/types'
import { cn } from '@stellariscloud/ui-toolkit'
import {
  mediaTypeFromExtension,
  mediaTypeFromMimeType,
} from '@stellariscloud/utils'
import React from 'react'

import { AudioPlayer } from '@/src/components/audio-player/audio-player'
import { VideoPlayer } from '@/src/components/video-player/video-player'
import { useLocalFileCacheContext } from '@/src/contexts/local-file-cache.context'
import { $api } from '@/src/services/api'
import { iconForMediaType } from '@/src/utils/icons'

export const FolderObjectPreview = ({
  folderId,
  objectKey,
  objectMetadata,
  previewObjectKey,
  displayMode = 'object-contain',
}: {
  folderId: string
  objectKey: string
  objectMetadata?: FolderObjectDTO
  previewObjectKey: string | undefined
  displayMode?: string
}) => {
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

  const folderObjectQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/objects/{objectKey}',
    {
      params: { path: { folderId, objectKey } },
    },
    { enabled: !!folderId && !!objectKey },
  )
  const folderObject = objectMetadata ?? folderObjectQuery.data?.folderObject

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

  const contentMetadata =
    folderObject?.hash && folderObject.hash in folderObject.contentMetadata
      ? folderObject.contentMetadata[folderObject.hash]
      : undefined

  const mimeType =
    folderObject?.hash && contentMetadata ? contentMetadata.mimeType : undefined

  const dataURL = file === false ? undefined : file.dataURL
  const mediaType =
    mimeType && !mimeType.external
      ? mediaTypeFromMimeType(mimeType.content)
      : mediaTypeFromExtension(folderObject?.objectKey.split('.').at(-1) ?? '')

  const isCoverView = displayMode === 'object-cover'

  const IconComponent = iconForMediaType(mediaType)

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
              className={cn(displayMode, 'size-full')}
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
          <div className="flex size-full flex-col items-center justify-around">
            <div className="flex items-center justify-center rounded-full p-10">
              <IconComponent className="size-24 stroke-foreground opacity-30 md:size-36 lg:size-48" />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
