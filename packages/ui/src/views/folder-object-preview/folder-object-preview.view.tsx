import type { FolderObjectDTO } from '@stellariscloud/types'
import { MediaType } from '@stellariscloud/types'
import { cn } from '@stellariscloud/ui-toolkit'
import { dataURLToText, isRenderableTextMimeType } from '@stellariscloud/utils'
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

  const mimeType = folderObject?.mimeType
  const mediaType = (folderObject?.mediaType ?? MediaType.Unknown) as MediaType

  const isRenderableText = !!mimeType && isRenderableTextMimeType(mimeType)

  React.useEffect(() => {
    if (!file && previewObjectKey) {
      void getData(folderId, previewObjectKey).then((f) => {
        if (f) {
          setFile({
            previewObjectKey,
            dataURL: isRenderableText ? dataURLToText(f.dataURL) : f.dataURL,
            type: f.type,
          })
        }
      })
    }
  }, [file, folderId, getData, previewObjectKey, isRenderableText])

  const dataURL = file === false ? undefined : file?.dataURL
  const isCoverView = displayMode === 'object-cover'

  const IconComponent = iconForMediaType(mediaType)

  const renderEmptyPreview = () => (
    <div className="flex size-full flex-col items-center justify-around">
      <div className="flex items-center justify-center rounded-full">
        <IconComponent className="size-20 opacity-30 lg:size-24" />
      </div>
    </div>
  )

  return (
    <div
      className={cn(
        'flex justify-center size-full bg-foreground/[.03] rounded-md',
      )}
    >
      <div
        className={cn(
          'flex justify-center overflow-hidden',
          isCoverView && 'size-full',
        )}
      >
        {(file &&
          dataURL &&
          (mediaType === MediaType.Image ? (
            <div className={cn('flex-1 flex flex-col justify-around')}>
              <img
                className={cn(
                  !isCoverView && 'max-w-full max-h-full',
                  displayMode,
                )}
                alt={fileName ?? objectKey}
                src={dataURL}
              />
            </div>
          ) : mediaType === MediaType.Video ? (
            <div className="flex h-full justify-center">
              <VideoPlayer
                className={displayMode}
                width="100%"
                height="100%"
                controls
                src={dataURL}
              />
            </div>
          ) : mediaType === MediaType.Audio ? (
            <div className="flex size-full items-center justify-center p-4">
              <div className="sm:size-full lg:size-4/5 xl:size-3/5">
                <AudioPlayer
                  width="100%"
                  height="100%"
                  controls
                  src={dataURL}
                />
              </div>
            </div>
          ) : mediaType === MediaType.Document && isRenderableText ? (
            <div className="size-full overflow-hidden">
              <pre className="size-full overflow-auto p-4 text-sm">
                {dataURL}
              </pre>
            </div>
          ) : (
            renderEmptyPreview()
          ))) ??
          renderEmptyPreview()}
      </div>
    </div>
  )
}
