import type { FolderObjectDTO } from '@lombokapp/types'
import { MediaType } from '@lombokapp/types'
import { cn } from '@lombokapp/ui-toolkit'
import {
  dataURLToText,
  documentLabelFromMimeType,
  isRenderableTextMimeType,
} from '@lombokapp/utils'
import React from 'react'

import { AudioPlayer } from '@/src/components/audio-player/audio-player'
import { PDFViewer } from '@/src/components/pdf-viewer/pdf-viewer'
import { VideoPlayer } from '@/src/components/video-player/video-player'
import { useLocalFileCacheContext } from '@/src/contexts/local-file-cache'
import { $api } from '@/src/services/api'
import { iconForMediaType } from '@/src/utils/icons'

export const FolderObjectPreview = ({
  folderId,
  objectKey,
  objectMetadata,
  previewConfig,
  displayMode = 'object-contain',
}: {
  folderId: string
  objectKey: string
  objectMetadata?: FolderObjectDTO
  previewConfig:
    | {
        contentKey: string
        mediaType: MediaType
        mimeType: string
      }
    | undefined
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

  const contentHash = folderObject?.hash ?? ''

  const contentMetadata =
    folderObject && contentHash && contentHash in folderObject.contentMetadata
      ? folderObject.contentMetadata[contentHash]
      : undefined

  const mimeType =
    contentMetadata &&
    'mimeType' in contentMetadata &&
    contentMetadata.mimeType.type === 'inline'
      ? (JSON.parse(contentMetadata.mimeType.content) as string)
      : (folderObject?.mimeType ?? undefined)

  const mediaType = (
    contentMetadata &&
    'mediaType' in contentMetadata &&
    contentMetadata.mediaType.type === 'inline'
      ? JSON.parse(contentMetadata.mediaType.content)
      : (folderObject?.mediaType ?? MediaType.Unknown)
  ) as MediaType

  const isRenderableText = !!mimeType && isRenderableTextMimeType(mimeType)

  React.useEffect(() => {
    if (!file && previewConfig?.contentKey) {
      void getData(folderId, previewConfig.contentKey).then((f) => {
        if (f) {
          setFile({
            previewObjectKey: previewConfig.contentKey,
            dataURL: isRenderableText ? dataURLToText(f.dataURL) : f.dataURL,
            type: f.type,
          })
        }
      })
    }
  }, [file, folderId, getData, previewConfig, isRenderableText])

  const dataURL = file === false ? undefined : file?.dataURL
  const isCoverView =
    displayMode === 'object-cover' ||
    previewConfig?.mediaType === MediaType.Document

  const IconComponent = iconForMediaType(mediaType)
  const overlayLabel = React.useMemo<string | undefined>(() => {
    if (mediaType === MediaType.Document) {
      return documentLabelFromMimeType(mimeType)
    }
    return undefined
  }, [mediaType, mimeType])

  const renderEmptyPreview = () => (
    <div className="flex size-full flex-col items-center justify-around">
      <div className="relative flex items-center justify-center rounded-full">
        <IconComponent className="size-20 fill-background opacity-30 lg:size-24" />
        {overlayLabel ? (
          <span className="absolute translate-y-full rounded px-1.5 py-0.5 text-xs font-bold tracking-wide text-foreground/50">
            {overlayLabel}
          </span>
        ) : null}
      </div>
    </div>
  )
  return (
    <div
      className={cn(
        'flex relative justify-center size-full bg-foreground/[.03] rounded-md max-w-full max-h-full',
      )}
    >
      <div
        className={cn(
          'flex justify-center max-w-full max-h-full overflow-hidden',
          isCoverView && 'size-full',
        )}
      >
        {(file &&
          dataURL &&
          (previewConfig?.mediaType === MediaType.Image ? (
            <div
              className={cn(
                'flex-1 flex flex-col justify-around size-full',
                isCoverView && 'min-w-max min-h-max',
              )}
            >
              <img
                className={cn(
                  !isCoverView
                    ? 'h-full max-w-min max-h-min'
                    : 'max-w-full max-h-full',
                  displayMode,
                )}
                alt={fileName ?? objectKey}
                src={dataURL}
              />
            </div>
          ) : previewConfig?.mediaType === MediaType.Video ? (
            <div className="flex size-full justify-center">
              <VideoPlayer
                className={cn(
                  !isCoverView ? 'h-full max-h-min' : 'max-w-fit max-h-fit',
                  displayMode,
                )}
                controls
                src={dataURL}
              />
            </div>
          ) : previewConfig?.mediaType === MediaType.Audio ? (
            <div className="flex size-full items-center justify-center p-4">
              <AudioPlayer width="100%" height="100%" controls src={dataURL} />
            </div>
          ) : previewConfig?.mediaType === MediaType.Document &&
            isRenderableText ? (
            <div className="size-full overflow-hidden">
              <pre className="size-full overflow-auto p-4 text-sm">
                {dataURL}
              </pre>
            </div>
          ) : previewConfig?.mediaType === MediaType.Document &&
            previewConfig.mimeType === 'application/pdf' ? (
            dataURL ? (
              <PDFViewer className="size-full" dataURL={dataURL} />
            ) : null
          ) : (
            renderEmptyPreview()
          ))) ??
          renderEmptyPreview()}
      </div>
    </div>
  )
}
