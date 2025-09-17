import type {
  ContentMetadataEntry,
  FolderObjectDTO,
  PreviewMetadata,
} from '@lombokapp/types'
import { MediaType } from '@lombokapp/types'
import { Button, ButtonVariant } from '@lombokapp/ui-toolkit/components'
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
import { iconForMediaType } from '@/src/utils/icons'

import { canRenderOriginal } from './can-render.util'

const LazyPDFViewer = React.lazy(() =>
  import('@/src/components/pdf-viewer/pdf-viewer').then((m) => ({
    default: m.PDFViewer,
  })),
)

export type DisplayConfig =
  | { type: 'original' } // attempt to render the original content
  | { type: 'preview_variant'; variantKey: string } // attempt to render a specific preview variant
  | { type: 'preview_purpose'; purposeType: string }

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
  displayConfig,
  displayMode = 'object-contain',
  folderObject,
  showExplanation = false,
  maxRenderSizeBytes = 100 * 1024,
}: {
  folderId: string
  objectKey: string
  displayConfig: DisplayConfig | undefined
  displayMode?: string
  maxRenderSizeBytes?: number
  showExplanation?: boolean
  folderObject: FolderObjectDTO
}) => {
  const fileName = objectKey.split('/').at(-1)
  const { getPresignedDownloadUrl } = useLocalFileCacheContext()
  const [srcUrl, setSrcUrl] = React.useState<string | undefined>()

  const currentObjectContentMetadata =
    resolveLatestContentMetadata(folderObject) ?? undefined

  const previews = React.useMemo(() => {
    return currentObjectContentMetadata?.previews?.type === 'inline'
      ? (JSON.parse(currentObjectContentMetadata.previews.content) as Record<
          string,
          PreviewMetadata
        >)
      : {}
  }, [currentObjectContentMetadata])

  const canRenderOriginalResult = canRenderOriginal(
    folderObject,
    maxRenderSizeBytes,
  )

  function resolveRenderedVersion(): {
    renderedContentKey: string
    mimeType: string
    mediaType: MediaType
  } {
    if (
      displayConfig?.type === 'preview_variant' &&
      displayConfig.variantKey in previews
    ) {
      return {
        renderedContentKey: `metadata:${objectKey}:${previews[displayConfig.variantKey]?.hash}`,
        mimeType: previews[displayConfig.variantKey]?.mimeType ?? '',
        mediaType: mediaTypeFromMimeType(
          previews[displayConfig.variantKey]?.mimeType ?? '',
        ),
      }
    }
    if (displayConfig?.type === 'preview_purpose') {
      const purposeMatchedVariantKey =
        Object.keys(previews).find(
          (previewVariantKey) =>
            previews[previewVariantKey]?.purpose === displayConfig.purposeType,
        ) ||
        Object.keys(previews).find(
          (previewVariantKey) =>
            previews[previewVariantKey]?.purpose === 'preview', // Generic preview fallback
        )
      if (purposeMatchedVariantKey) {
        const previewVariant = previews[purposeMatchedVariantKey]
        return {
          renderedContentKey: `metadata:${objectKey}:${previewVariant?.hash}`,
          mimeType: previews[displayConfig.purposeType]?.mimeType ?? '',
          mediaType: mediaTypeFromMimeType(
            previews[purposeMatchedVariantKey]?.mimeType ?? '',
          ),
        }
      }
    }
    return {
      renderedContentKey: `content:${objectKey}`,
      mimeType: folderObject.mimeType,
      mediaType: mediaTypeFromMimeType(folderObject.mimeType),
    }
  }

  const { renderedContentKey, mimeType, mediaType } = resolveRenderedVersion()

  const isRenderableDocument =
    !!mimeType && isRenderableDocumentMimeType(mimeType)
  const isTextRenderableDocument =
    !!mimeType && isRenderableTextMimeType(mimeType)

  React.useEffect(() => {
    if (!srcUrl && renderedContentKey) {
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
  const IconComponent = iconForMediaType(mediaType)
  const overlayLabel = React.useMemo<string | undefined>(() => {
    if (mediaType === MediaType.Document) {
      return documentLabelFromMimeType(mimeType)
    }
    return undefined
  }, [mediaType, mimeType])

  const [renderBlockOverriden, setRenderBlockOverriden] = React.useState(false)

  const renderEmptyPreview = (
    loadRestriction?: 'TOO_LARGE' | 'FORMAT_NOT_SUPPORTED',
  ) => (
    <div className="flex size-full flex-col items-center justify-center">
      <div className="flex items-center justify-center rounded-full">
        <IconComponent className="size-20 fill-background opacity-30 lg:size-24" />
      </div>
      {overlayLabel ? (
        <span className="rounded px-1.5 py-0.5 text-xs font-bold tracking-wide text-foreground/50">
          {overlayLabel}
        </span>
      ) : null}
      {loadRestriction && showExplanation && (
        <span className="rounded px-1.5 py-0.5 text-xs font-bold tracking-wide text-foreground/50">
          <div className="flex flex-col items-center gap-2">
            <div>
              {loadRestriction === 'TOO_LARGE'
                ? 'File too large'
                : `Mime type "${mimeType}" cannot be rendered`}
            </div>
            {loadRestriction === 'TOO_LARGE' && (
              <div>
                <Button
                  variant={ButtonVariant.outline}
                  onClick={() => setRenderBlockOverriden(true)}
                >
                  Render anyway
                </Button>
              </div>
            )}
          </div>
        </span>
      )}
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
        {renderedContentKey &&
        renderedContentKey.startsWith('content:') &&
        !canRenderOriginalResult.result &&
        !renderBlockOverriden ? (
          renderEmptyPreview(canRenderOriginalResult.reason)
        ) : srcUrl && mediaType === MediaType.Image ? (
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
