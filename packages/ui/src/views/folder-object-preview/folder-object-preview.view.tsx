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

const EMPTY_CONTENT_METADATA: Record<string, ContentMetadataEntry> = {}

function resolveLatestContentMetadata(
  folderObject: FolderObjectDTO,
): Record<string, ContentMetadataEntry> {
  return folderObject.hash && folderObject.contentMetadata[folderObject.hash]
    ? (folderObject.contentMetadata[folderObject.hash] ??
        EMPTY_CONTENT_METADATA)
    : EMPTY_CONTENT_METADATA
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

  const currentObjectContentMetadata =
    resolveLatestContentMetadata(folderObject)

  const previews = React.useMemo(() => {
    return currentObjectContentMetadata.previews?.type === 'inline'
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
  const resolveRenderedVersion = React.useCallback((): {
    renderedContentKey: string
    mimeType: string
    mediaType: MediaType
  } => {
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
  }, [displayConfig, folderObject, objectKey, previews])

  const [toRender, setToRender] = React.useState<
    | {
        srcUrl: string
        mimeType: string
        mediaType: MediaType
        renderedContentKey: string
        isRenderableDocument: boolean
        isTextRenderableDocument: boolean
      }
    | undefined
  >(undefined)

  React.useEffect(() => {
    void (async () => {
      let srcUrl: string | undefined
      const { mimeType, mediaType, renderedContentKey } =
        resolveRenderedVersion()
      const isRenderableDocument = isRenderableDocumentMimeType(mimeType)
      const isTextRenderableDocument = isRenderableTextMimeType(mimeType)
      if (renderedContentKey) {
        await getPresignedDownloadUrl(folderId, renderedContentKey).then(
          async ({ url }) => {
            if (isTextRenderableDocument) {
              const contents = await fetch(url)
              srcUrl = await contents.text()
            } else {
              srcUrl = url
            }
          },
        )
      }
      setToRender({
        srcUrl: srcUrl ?? '',
        mimeType,
        mediaType,
        renderedContentKey,
        isRenderableDocument,
        isTextRenderableDocument,
      })
    })()
  }, [getPresignedDownloadUrl, folderId, objectKey, resolveRenderedVersion])

  const isCoverView =
    displayMode === 'object-cover' || toRender?.mediaType === MediaType.DOCUMENT
  const IconComponent = iconForMediaType(
    toRender?.mediaType ?? MediaType.UNKNOWN,
  )
  const overlayLabel = React.useMemo<string | undefined>(() => {
    if (toRender?.mediaType === MediaType.DOCUMENT) {
      return documentLabelFromMimeType(toRender.mimeType)
    }
    return undefined
  }, [toRender?.mediaType, toRender?.mimeType])

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
                : `Mime type "${toRender?.mimeType}" cannot be rendered`}
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
        {toRender?.renderedContentKey.startsWith('content:') &&
        !canRenderOriginalResult.result &&
        !renderBlockOverriden ? (
          renderEmptyPreview(canRenderOriginalResult.reason)
        ) : toRender?.srcUrl && toRender.mediaType === MediaType.IMAGE ? (
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
              src={toRender.srcUrl}
            />
          </div>
        ) : toRender && toRender.mediaType === MediaType.VIDEO ? (
          <div className="flex size-full justify-center">
            <VideoPlayer
              className={cn(
                !isCoverView ? 'h-full max-h-min' : 'max-w-fit max-h-fit',
                displayMode,
              )}
              controls
              src={toRender.srcUrl}
            />
          </div>
        ) : toRender?.srcUrl && toRender.mediaType === MediaType.AUDIO ? (
          <div className="flex size-full items-center justify-center p-4">
            <AudioPlayer
              width="100%"
              height="100%"
              controls
              src={toRender.srcUrl}
            />
          </div>
        ) : toRender?.srcUrl &&
          toRender.mediaType === MediaType.DOCUMENT &&
          toRender.isTextRenderableDocument ? (
          <div className="size-full overflow-hidden">
            <pre className="size-full overflow-auto p-4 text-sm">
              {toRender.srcUrl}
            </pre>
          </div>
        ) : toRender?.srcUrl &&
          toRender.mediaType === MediaType.DOCUMENT &&
          toRender.mimeType === 'application/pdf' ? (
          <React.Suspense fallback={null}>
            <LazyPDFViewer className="size-full" dataURL={toRender.srcUrl} />
          </React.Suspense>
        ) : (
          renderEmptyPreview()
        )}
      </div>
    </div>
  )
}
