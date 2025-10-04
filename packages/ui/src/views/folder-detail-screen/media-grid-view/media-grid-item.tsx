import type { FolderObjectDTO, PreviewMetadata } from '@lombokapp/types'
import { MediaType } from '@lombokapp/types'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import {
  encodeS3ObjectKey,
  formatBytes,
  mediaTypeFromMimeType,
} from '@lombokapp/utils'
import { Calendar, FileText, HardDrive } from 'lucide-react'
import React from 'react'
import { Link } from 'react-router'

import { useLocalFileCacheContext } from '@/src/contexts/local-file-cache'

import { FolderObjectPreview } from '../../folder-object-preview/folder-object-preview.view'

interface MediaGridItemProps {
  folderObject: FolderObjectDTO
  fixedSize?: { width: number; height: number }
  className?: string
}

export const MediaGridItem = ({
  folderObject,
  fixedSize,
  className,
}: MediaGridItemProps) => {
  const [isHovered, setIsHovered] = React.useState(false)
  const [imageLoaded, setImageLoaded] = React.useState(false)
  const [imageError, setImageError] = React.useState(false)

  const fileName =
    folderObject.objectKey.split('/').at(-1) ?? folderObject.objectKey
  const mediaType = mediaTypeFromMimeType(folderObject.mimeType)

  const { getPresignedDownloadUrl } = useLocalFileCacheContext()
  const [previewUrl, setPreviewUrl] = React.useState<string | null>(null)

  // For non-images, consider them "loaded" immediately
  React.useEffect(() => {
    if (mediaType !== MediaType.Image) {
      setImageLoaded(true)
    }
  }, [mediaType])

  // Get preview metadata for the current object
  const currentObjectContentMetadata = React.useMemo(() => {
    return folderObject.hash && folderObject.contentMetadata[folderObject.hash]
      ? (folderObject.contentMetadata[folderObject.hash] ?? {})
      : {}
  }, [folderObject.hash, folderObject.contentMetadata])

  const previews = React.useMemo(() => {
    return currentObjectContentMetadata.previews?.type === 'inline'
      ? (JSON.parse(currentObjectContentMetadata.previews.content) as Record<
          string,
          PreviewMetadata
        >)
      : {}
  }, [currentObjectContentMetadata])

  // Find the best preview variant for card display
  const getPreviewDimensions = React.useCallback(() => {
    // Look for "card" purpose first, then "list" as fallback
    const cardPreview = Object.values(previews).find(
      (preview) => preview.purpose === 'card',
    )
    const listPreview = Object.values(previews).find(
      (preview) => preview.purpose === 'list',
    )

    const preview = cardPreview || listPreview

    if (preview?.dimensions.width && preview.dimensions.height) {
      return {
        width: preview.dimensions.width,
        height: preview.dimensions.height,
        aspectRatio: preview.dimensions.width / preview.dimensions.height,
      }
    }

    return null
  }, [previews])

  // Get preview URL for images to track loading
  React.useEffect(() => {
    if (mediaType === MediaType.Image) {
      // Find the preview variant we're using
      const cardPreview = Object.values(previews).find(
        (preview) => preview.purpose === 'card',
      )
      const listPreview = Object.values(previews).find(
        (preview) => preview.purpose === 'list',
      )
      const preview = cardPreview || listPreview

      if (preview?.hash) {
        void getPresignedDownloadUrl(
          folderObject.folderId,
          `metadata:${folderObject.objectKey}:${preview.hash}`,
        )
          .then(({ url }) => {
            setPreviewUrl(url)
          })
          .catch(() => {
            setImageError(true)
            setImageLoaded(true)
          })
      } else {
        // No preview available, mark as loaded to stop loading animation
        setImageLoaded(true)
      }
    }
  }, [
    mediaType,
    getPresignedDownloadUrl,
    folderObject.folderId,
    folderObject.objectKey,
    previews,
  ])

  // Hybrid Adaptive Grid sizing: intelligent per-content-type
  const getGridItemStyle = React.useCallback(() => {
    const previewDims = getPreviewDimensions()

    if (mediaType === MediaType.Image && previewDims) {
      const { aspectRatio } = previewDims

      // Images: use aspect-ratio CSS to maintain natural proportions
      // Grid will size the width, aspect-ratio handles height
      return {
        aspectRatio: aspectRatio.toString(),
      }
    }

    if (mediaType === MediaType.Video && previewDims) {
      // Videos: similar to images but can have different treatment
      return {
        aspectRatio: previewDims.aspectRatio.toString(),
      }
    }

    // Audio: compact fixed aspect ratio
    if (mediaType === MediaType.Audio) {
      return {
        aspectRatio: '16 / 9', // Wide and short
      }
    }

    // Documents: medium fixed aspect ratio
    if (mediaType === MediaType.Document) {
      return {
        aspectRatio: '3 / 4', // Portrait-ish
      }
    }

    // Unknown: square fallback
    return {
      aspectRatio: '1 / 1',
    }
  }, [mediaType, getPreviewDimensions])

  const displayConfig = React.useMemo(() => {
    // Use the same logic as getPreviewDimensions to determine the best purpose
    const hasCardPreview = Object.values(previews).some(
      (preview) => preview.purpose === 'card',
    )

    return {
      type: 'preview_purpose',
      purposeType: hasCardPreview ? 'card' : 'list',
    } as const
  }, [previews])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  return (
    <Link
      to={`/folders/${folderObject.folderId}/objects/${encodeS3ObjectKey(folderObject.objectKey)}`}
      className={cn(
        'group relative block overflow-hidden rounded-lg bg-card transition-all duration-200',
        'hover:shadow-xl hover:shadow-black/10 hover:-translate-y-1',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
        'border border-border/20 dark:border-0 hover:border-border',
        // Better loading state
        !imageLoaded && mediaType === MediaType.Image && 'animate-pulse',
        className,
      )}
      style={
        fixedSize
          ? { width: fixedSize.width, height: fixedSize.height }
          : getGridItemStyle()
      }
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Main preview area */}
      <div className="relative size-full">
        <FolderObjectPreview
          key={folderObject.objectKey}
          folderId={folderObject.folderId}
          displayMode="object-cover"
          displayConfig={displayConfig}
          folderObject={folderObject}
          objectKey={folderObject.objectKey}
        />

        {/* Enhanced gradient overlay */}
        <div
          className={cn(
            'absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent',
            'transition-all duration-200',
            isHovered ? 'opacity-100' : 'opacity-0',
          )}
        />

        {/* Improved metadata overlay */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 p-3 text-white transition-all duration-200',
            isHovered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          )}
        >
          {/* File name with better typography */}
          <div className="mb-2 line-clamp-2 text-sm font-semibold leading-tight drop-shadow-md">
            {fileName}
          </div>

          {/* Compact file details */}
          <div className="flex flex-wrap items-center gap-3 text-xs text-white/90">
            {/* File size */}
            <div className="flex items-center gap-1">
              <HardDrive className="size-3" />
              <span>{formatBytes(folderObject.sizeBytes)}</span>
            </div>

            {/* Media type badge */}
            <div className="flex items-center gap-1">
              <FileText className="size-3" />
              <span className="capitalize">{mediaType.toLowerCase()}</span>
            </div>
          </div>

          {/* Last modified */}
          <div className="mt-1.5 flex items-center gap-1 text-xs text-white/70">
            <Calendar className="size-3" />
            <span>{formatDate(folderObject.lastModified)}</span>
          </div>
        </div>

        {/* Loading state overlay */}
        {!imageLoaded && mediaType === MediaType.Image && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/30 backdrop-blur-sm">
            <div className="size-8 animate-spin rounded-full border-2 border-muted-foreground border-t-transparent" />
          </div>
        )}

        {/* Error state overlay */}
        {imageError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-muted/80 text-muted-foreground">
            <FileText className="mb-2 size-12 opacity-50" />
            <span className="text-xs">Failed to load</span>
          </div>
        )}

        {/* Hidden image for loading state tracking */}
        {mediaType === MediaType.Image && previewUrl && (
          <img
            src={previewUrl}
            alt=""
            className="pointer-events-none invisible absolute inset-0"
            onLoad={() => setImageLoaded(true)}
            onError={() => {
              setImageError(true)
              setImageLoaded(true)
            }}
          />
        )}
      </div>
    </Link>
  )
}
