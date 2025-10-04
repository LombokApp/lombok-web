import type { FolderObjectDTO, PreviewMetadata } from '@lombokapp/types'
import { MediaType } from '@lombokapp/types'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { mediaTypeFromMimeType } from '@lombokapp/utils'
import React from 'react'

import { MediaGridItem } from './media-grid-item'

interface MediaGridViewProps {
  items: FolderObjectDTO[]
  hasNextPage: boolean
  isFetchingNextPage: boolean
  onLoadMore: () => void
  totalCount?: number
  className?: string
  onScrollMetrics?: (metrics: {
    scrolledAway: boolean
    nearTop: boolean
  }) => void
  initialCursor?: string
  onLoadPrevious?: () => void
  isFetchingPrevious?: boolean
}

interface LayoutItem {
  item: FolderObjectDTO
  width: number
  height: number
  aspectRatio: number
}

interface LayoutRow {
  items: LayoutItem[]
  rowHeight: number
}

export const MediaGridView = ({
  items,
  hasNextPage,
  isFetchingNextPage,
  onLoadMore,
  totalCount,
  className,
  onScrollMetrics,
  initialCursor,
  onLoadPrevious,
  isFetchingPrevious,
}: MediaGridViewProps) => {
  const containerRef = React.useRef<HTMLDivElement>(null)
  const sentinelRef = React.useRef<HTMLDivElement | null>(null)
  const topSentinelRef = React.useRef<HTMLDivElement | null>(null)
  const [containerWidth, setContainerWidth] = React.useState(0)
  const [hasRestoredPosition, setHasRestoredPosition] = React.useState(false)

  // Intersection Observer for infinite scroll (bottom)
  React.useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || !hasNextPage || isFetchingNextPage) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadMore()
        }
      },
      { root: containerRef.current, rootMargin: '800px 0px' }, // Observe within scroll container
    )

    observer.observe(sentinel)

    return () => {
      observer.disconnect()
    }
  }, [hasNextPage, isFetchingNextPage, onLoadMore])

  // Intersection Observer for loading previous items (top)
  React.useEffect(() => {
    const topSentinel = topSentinelRef.current
    if (!topSentinel || !onLoadPrevious || isFetchingPrevious) {
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          onLoadPrevious()
        }
      },
      { root: containerRef.current, rootMargin: '800px 0px' },
    )

    observer.observe(topSentinel)

    return () => {
      observer.disconnect()
    }
  }, [onLoadPrevious, isFetchingPrevious])

  // Measure container width
  React.useEffect(() => {
    const updateWidth = () => {
      if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth)
      }
    }

    updateWidth()
    const resizeObserver = new ResizeObserver(updateWidth)
    if (containerRef.current) {
      resizeObserver.observe(containerRef.current)
    }

    return () => resizeObserver.disconnect()
  }, [])

  // Extract aspect ratio from preview metadata
  const getItemAspectRatio = React.useCallback(
    (item: FolderObjectDTO): number => {
      const mediaType = mediaTypeFromMimeType(item.mimeType)

      // Try to get from preview metadata
      const metadata =
        item.hash && item.contentMetadata[item.hash]
          ? item.contentMetadata[item.hash]
          : null

      if (metadata?.previews?.type === 'inline') {
        try {
          const previews = JSON.parse(metadata.previews.content) as Record<
            string,
            PreviewMetadata
          >

          // Look for "card" purpose first, then "list" as fallback
          const cardPreview = Object.values(previews).find(
            (p) => p.purpose === 'card',
          )
          const listPreview = Object.values(previews).find(
            (p) => p.purpose === 'list',
          )
          const preview = cardPreview || listPreview

          if (preview?.dimensions.width && preview.dimensions.height) {
            return preview.dimensions.width / preview.dimensions.height
          }
        } catch {
          // Fall through to defaults
        }
      }

      // Fallback aspect ratios by media type when no preview exists
      switch (mediaType) {
        case MediaType.Video:
          return 16 / 9
        case MediaType.Audio:
          return 16 / 9
        case MediaType.Document:
          return 3 / 4
        case MediaType.Image:
        case MediaType.Unknown:
        default:
          return 1 / 1 // Square fallback - will show icon
      }
    },
    [],
  )

  // Dynamic tiling algorithm: perfect rows with no gaps, respecting orientation
  const calculateLayout = React.useCallback((): LayoutRow[] => {
    if (containerWidth === 0 || items.length === 0) {
      return []
    }

    const rows: LayoutRow[] = []
    const gap = 16 // Gap between items
    const minRowHeight = 200
    const maxRowHeight = 500 // Increased to allow for portrait images

    // Target height varies based on orientation mix
    let currentRowItems: LayoutItem[] = []
    let currentRowWidth = 0

    for (const item of items) {
      const aspectRatio = getItemAspectRatio(item)

      // Determine target height based on orientation
      // Portrait images (< 0.85) get taller target, landscape (> 1.2) get shorter
      let targetRowHeight: number
      if (aspectRatio < 0.85) {
        targetRowHeight = 350 // Taller for portrait
      } else if (aspectRatio > 1.2) {
        targetRowHeight = 250 // Shorter for landscape
      } else {
        targetRowHeight = 280 // Medium for square-ish
      }

      const itemWidth = targetRowHeight * aspectRatio

      // Check if adding this item would overflow the row
      const projectedWidth =
        currentRowWidth + itemWidth + (currentRowItems.length > 0 ? gap : 0)

      if (projectedWidth > containerWidth && currentRowItems.length > 0) {
        // Finalize current row with perfect fit
        const availableWidth =
          containerWidth - (currentRowItems.length - 1) * gap

        // Calculate ideal row height that respects all aspect ratios
        const sumAspectRatios = currentRowItems.reduce(
          (sum, i) => sum + i.aspectRatio,
          0,
        )
        const idealRowHeight = availableWidth / sumAspectRatios

        // Check if we have any portrait items in this row
        const hasPortrait = currentRowItems.some((i) => i.aspectRatio < 0.85)
        const hasLandscape = currentRowItems.some((i) => i.aspectRatio > 1.2)

        // Adjust constraints based on orientation mix
        let adjustedMinHeight = minRowHeight
        let adjustedMaxHeight = maxRowHeight

        if (hasPortrait && !hasLandscape) {
          // Row of portraits - allow taller
          adjustedMinHeight = 280
          adjustedMaxHeight = 500
        } else if (hasLandscape && !hasPortrait) {
          // Row of landscapes - keep shorter
          adjustedMaxHeight = 350
        }

        const rowHeight = Math.min(
          Math.max(idealRowHeight, adjustedMinHeight),
          adjustedMaxHeight,
        )

        rows.push({
          items: currentRowItems.map((i) => ({
            ...i,
            height: rowHeight,
            width: rowHeight * i.aspectRatio,
          })),
          rowHeight,
        })

        // Start new row
        currentRowItems = []
        currentRowWidth = 0
      }

      // Add item to current row
      currentRowItems.push({
        item,
        width: itemWidth,
        height: targetRowHeight,
        aspectRatio,
      })
      currentRowWidth += itemWidth + (currentRowItems.length > 1 ? gap : 0)
    }

    // Handle last row
    if (currentRowItems.length > 0) {
      const availableWidth = containerWidth - (currentRowItems.length - 1) * gap
      const sumAspectRatios = currentRowItems.reduce(
        (sum, i) => sum + i.aspectRatio,
        0,
      )
      const idealRowHeight = availableWidth / sumAspectRatios

      const hasPortrait = currentRowItems.some((i) => i.aspectRatio < 0.85)
      const hasLandscape = currentRowItems.some((i) => i.aspectRatio > 1.2)

      let adjustedMinHeight = minRowHeight
      let adjustedMaxHeight = maxRowHeight

      if (hasPortrait && !hasLandscape) {
        adjustedMinHeight = 280
        adjustedMaxHeight = 500
      } else if (hasLandscape && !hasPortrait) {
        adjustedMaxHeight = 350
      }

      const rowHeight = Math.min(
        Math.max(idealRowHeight, adjustedMinHeight),
        adjustedMaxHeight,
      )

      rows.push({
        items: currentRowItems.map((i) => ({
          ...i,
          height: rowHeight,
          width: rowHeight * i.aspectRatio,
        })),
        rowHeight,
      })
    }

    return rows
  }, [items, containerWidth, getItemAspectRatio])

  const layout = React.useMemo(() => calculateLayout(), [calculateLayout])

  // Report simple scroll metrics to parent (away from top / near top)
  React.useEffect(() => {
    const container = containerRef.current
    if (!container || !onScrollMetrics) {
      return
    }

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      const clientHeight = container.clientHeight
      const scrolledAway = scrollTop > clientHeight * 0.9
      const nearTop = scrollTop < clientHeight * 0.6
      onScrollMetrics({ scrolledAway, nearTop })
    }

    // Fire once to initialize
    handleScroll()
    container.addEventListener('scroll', handleScroll, { passive: true })
    return () => container.removeEventListener('scroll', handleScroll)
  }, [onScrollMetrics])

  // Restore scroll position when loading with a cursor
  React.useEffect(() => {
    const container = containerRef.current
    if (
      !container ||
      !initialCursor ||
      hasRestoredPosition ||
      items.length === 0
    ) {
      return
    }

    // Wait for layout to be calculated, then scroll to middle of the list
    const timeoutId = setTimeout(() => {
      if (items.length > 0) {
        // Scroll to approximately the middle of the loaded items
        const estimatedItemHeight = 200
        const estimatedScrollTop = Math.max(
          0,
          (items.length * estimatedItemHeight) / 2 - container.clientHeight / 2,
        )
        container.scrollTop = estimatedScrollTop
        setHasRestoredPosition(true)
      }
    }, 100)

    return () => clearTimeout(timeoutId)
  }, [initialCursor, items.length, hasRestoredPosition])

  return (
    <div ref={containerRef} className={cn('flex-1 overflow-auto', className)}>
      {isFetchingPrevious && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-3 size-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">
            Loading previous items...
          </p>
        </div>
      )}
      <div ref={topSentinelRef} />{' '}
      {/* Top sentinel for loading previous items */}
      <div className="flex flex-col gap-4">
        {layout.map((row, rowIndex) => (
          <div
            key={rowIndex}
            className="flex gap-4"
            style={{ height: row.rowHeight }}
          >
            {row.items.map((layoutItem, itemIndex) => (
              <div
                key={`${layoutItem.item.folderId}-${layoutItem.item.objectKey}-${itemIndex}`}
                style={{
                  width: layoutItem.width,
                  height: layoutItem.height,
                  flexShrink: 0,
                }}
              >
                <MediaGridItem
                  folderObject={layoutItem.item}
                  fixedSize={{
                    width: layoutItem.width,
                    height: layoutItem.height,
                  }}
                />
              </div>
            ))}
          </div>
        ))}
      </div>
      {isFetchingNextPage && (
        <div className="flex flex-col items-center justify-center py-12">
          <div className="mb-3 size-10 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-sm text-muted-foreground">Loading more items...</p>
        </div>
      )}
      {!hasNextPage && items.length > 0 && (
        <div className="py-12 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-muted/50 px-4 py-2 text-sm text-muted-foreground">
            <div className="size-1.5 rounded-full bg-muted-foreground/50" />
            <span>
              {totalCount !== undefined ? totalCount : items.length} items
              loaded
            </span>
            <div className="size-1.5 rounded-full bg-muted-foreground/50" />
          </div>
        </div>
      )}
      <div ref={sentinelRef} /> {/* Sentinel for infinite scroll */}
    </div>
  )
}
