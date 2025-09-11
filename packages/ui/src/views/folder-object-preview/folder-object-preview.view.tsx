import type {
  ContentMetadataEntry,
  ExternalMetadataEntry,
  FolderObjectDTO,
} from '@lombokapp/types'
import { MediaType } from '@lombokapp/types'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import {
  documentLabelFromMimeType,
  isRenderableDocumentMimeType,
  isRenderableTextMimeType,
  mediaTypeFromMimeType,
} from '@lombokapp/utils'
import React from 'react'

import { AudioPlayer } from '@/src/components/audio-player/audio-player'
import { VideoPlayer } from '@/src/components/video-player/video-player'
import { useLocalFileCacheContext } from '@/src/contexts/local-file-cache'
import { $api } from '@/src/services/api'
import { iconForMediaType } from '@/src/utils/icons'

const LazyPDFViewer = React.lazy(() =>
  import('@/src/components/pdf-viewer/pdf-viewer').then((m) => ({
    default: m.PDFViewer,
  })),
)

export type DisplayConfig =
  | { type: 'original' } // show the original content in some form
  | { type: 'metadata_preview'; metadataKey: string } // show the preview content referenced by the metadata key (alwys a webp image?)

function resolveLatestContentMetadata(
  folderObject: FolderObjectDTO,
): Record<string, ContentMetadataEntry> | undefined {
  return folderObject.hash && folderObject.contentMetadata[folderObject.hash]
    ? (folderObject.contentMetadata[folderObject.hash] ?? {})
    : {}
}

export const FolderObjectPreview = ({
  folderId,
  objectKey,
  objectMetadata,
  displayConfig,
  displayMode = 'object-contain',
}: {
  folderId: string
  objectKey: string
  objectMetadata?: FolderObjectDTO
  displayConfig: DisplayConfig | undefined
  displayMode?: string
}) => {
  const fileName = objectKey.split('/').at(-1)
  const { getPresignedDownloadUrl } = useLocalFileCacheContext()
  const [srcUrl, setSrcUrl] = React.useState<string | undefined>()
  const folderObjectQuery = $api.useQuery(
    'get',
    '/api/v1/folders/{folderId}/objects/{objectKey}',
    {
      params: { path: { folderId, objectKey } },
    },
    { enabled: !!folderId && !!objectKey },
  )
  const folderObject = objectMetadata ?? folderObjectQuery.data?.folderObject

  const latestObjectContentMetadata =
    (folderObject && resolveLatestContentMetadata(folderObject)) ?? undefined

  const mimeType =
    (latestObjectContentMetadata &&
      (displayConfig?.type === 'original' &&
      'mimeType' in latestObjectContentMetadata &&
      latestObjectContentMetadata.mimeType.type === 'inline'
        ? (JSON.parse(latestObjectContentMetadata.mimeType.content) as string)
        : displayConfig?.type === 'metadata_preview' &&
            displayConfig.metadataKey in latestObjectContentMetadata &&
            latestObjectContentMetadata[displayConfig.metadataKey]?.type ===
              'external'
          ? latestObjectContentMetadata[displayConfig.metadataKey]?.mimeType
          : undefined)) ??
    folderObject?.mimeType

  const mediaType = mimeType ? mediaTypeFromMimeType(mimeType) : undefined
  const renderedContentKey =
    displayConfig?.type === 'original'
      ? `content:${objectKey}`
      : latestObjectContentMetadata &&
          displayConfig?.type === 'metadata_preview' &&
          displayConfig.metadataKey in latestObjectContentMetadata &&
          latestObjectContentMetadata[displayConfig.metadataKey]?.type ===
            'external'
        ? `metadata:${objectKey}:${(latestObjectContentMetadata[displayConfig.metadataKey] as ExternalMetadataEntry).hash}`
        : undefined

  const isRenderableDocument =
    !!mimeType && isRenderableDocumentMimeType(mimeType)
  const isTextRenderableDocument =
    !!mimeType && isRenderableTextMimeType(mimeType)

  React.useEffect(() => {
    if (!srcUrl && mediaType && renderedContentKey) {
      void getPresignedDownloadUrl(folderId, renderedContentKey).then(
        async ({ url }) => {
          if (isTextRenderableDocument) {
            const contents = await fetch(url)
            setSrcUrl(await contents.text())
          } else {
            setSrcUrl(url)
          }
        },
      )
    }
  }, [
    srcUrl,
    mediaType,
    getPresignedDownloadUrl,
    folderId,
    objectKey,
    isRenderableDocument,
    renderedContentKey,
    isTextRenderableDocument,
  ])

  const isCoverView =
    displayMode === 'object-cover' || mediaType === MediaType.Document
  const IconComponent = iconForMediaType(mediaType ?? MediaType.Unknown)
  const overlayLabel = React.useMemo<string | undefined>(() => {
    if (mediaType === MediaType.Document) {
      return documentLabelFromMimeType(mimeType)
    }
    return undefined
  }, [mediaType, mimeType])

  const renderEmptyPreview = () => (
    <div className="flex size-full flex-col items-center justify-center">
      <div className="flex items-center justify-center rounded-full">
        <IconComponent className="size-20 fill-background opacity-30 lg:size-24" />
      </div>
      {overlayLabel ? (
        <span className="rounded px-1.5 py-0.5 text-xs font-bold tracking-wide text-foreground/50">
          {overlayLabel}
        </span>
      ) : null}
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
        {srcUrl && mediaType === MediaType.Image ? (
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
                  : 'max-w-full max-h-full size-full',
                displayMode,
              )}
              alt={fileName ?? objectKey}
              src={srcUrl}
            />
          </div>
        ) : srcUrl && mediaType === MediaType.Video ? (
          <div className="flex size-full justify-center">
            <VideoPlayer
              className={cn(
                !isCoverView ? 'h-full max-h-min' : 'max-w-fit max-h-fit',
                displayMode,
              )}
              controls
              src={srcUrl}
            />
          </div>
        ) : srcUrl && mediaType === MediaType.Audio ? (
          <div className="flex size-full items-center justify-center p-4">
            <AudioPlayer width="100%" height="100%" controls src={srcUrl} />
          </div>
        ) : srcUrl &&
          mediaType === MediaType.Document &&
          isTextRenderableDocument ? (
          <div className="size-full overflow-hidden">
            <pre className="size-full overflow-auto p-4 text-sm">{srcUrl}</pre>
          </div>
        ) : srcUrl &&
          mediaType === MediaType.Document &&
          mimeType === 'application/pdf' ? (
          <React.Suspense fallback={null}>
            <LazyPDFViewer className="size-full" dataURL={srcUrl} />
          </React.Suspense>
        ) : (
          renderEmptyPreview()
        )}
      </div>
    </div>
  )
}
