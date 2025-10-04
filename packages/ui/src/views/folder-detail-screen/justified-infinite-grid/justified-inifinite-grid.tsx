import { type FolderObjectDTO, isOk } from '@lombokapp/types'
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

import { $apiClient } from '@/src/services/api'

import { FolderObjectPreview } from '../../folder-object-preview/folder-object-preview.view'

const GRID_GAP_PX = 8
const maxRowHeight = 220

// Deterministic 32-bit FNV-1a hash for stable row identifiers
const fnv1a32 = (input: string): string => {
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

const deterministicRowId = (ids: string[]): string => {
  // JSON.stringify preserves order for arrays of strings, giving a stable input
  return fnv1a32(JSON.stringify(ids))
}

const getPreviewDims = (
  item: FolderObjectDTO,
): { w?: number; h?: number; ar?: number } => {
  const meta =
    item.hash && item.contentMetadata[item.hash]
      ? (item.contentMetadata[item.hash] ?? {})
      : {}
  const previews =
    meta.previews?.type === 'inline'
      ? (JSON.parse(meta.previews.content) as Record<
          string,
          {
            purpose?: string
            dimensions?: { width?: number; height?: number }
          }
        >)
      : {}
  const card = Object.values(previews).find((p) => p.purpose === 'card')
  const list = Object.values(previews).find((p) => p.purpose === 'list')
  const p = card || list
  const w = p?.dimensions?.width
  const h = p?.dimensions?.height
  if (w && h && w > 0 && h > 0) {
    return { w, h, ar: w / h }
  }
  return { ar: 1 }
}

const computeRows = (containerWidth: number, items: FolderObjectDTO[]) => {
  if (containerWidth <= 0 || items.length === 0) {
    return []
  }
  const targetHeight = maxRowHeight
  const nextRows: {
    id: string
    rowCount: number
    height: number
    items: {
      dimensions: { width: number; height: number }
      item: FolderObjectDTO
    }[]
  }[] = []
  let total = 0
  while (total < items.length) {
    let sumAR = 0
    let rowCount = 0
    while (rowCount + total < items.length) {
      const itemAtEnd = items[rowCount + total]
      if (!itemAtEnd) {
        break
      }
      const dims = getPreviewDims(itemAtEnd)
      const ar = dims.ar ?? 1
      const prospectiveSum = sumAR + ar
      const h =
        (containerWidth - GRID_GAP_PX * rowCount) /
        Math.max(0.0001, prospectiveSum)
      if (h <= targetHeight) {
        sumAR = prospectiveSum
        rowCount += 1
        break
      } else {
        sumAR = prospectiveSum
        rowCount += 1
      }
    }

    let rowHeight =
      (containerWidth - GRID_GAP_PX * Math.max(0, rowCount - 1)) /
      Math.max(0.0001, sumAR)
    const isLastRow = total + rowCount >= items.length
    if (isLastRow && rowHeight > targetHeight) {
      rowHeight = targetHeight
    }
    const rowIds = []
    const rowItems: {
      dimensions: { width: number; height: number }
      item: FolderObjectDTO
    }[] = []
    for (let i = total; i < total + rowCount; i += 1) {
      const itemAtI = items[i]
      if (!itemAtI) {
        continue
      }
      rowIds.push(itemAtI.id)
      const dims = getPreviewDims(itemAtI)
      const ar = dims.ar ?? 1
      rowItems.push({
        dimensions: { width: ar * rowHeight, height: rowHeight },
        item: itemAtI,
      })
    }
    const rowId = deterministicRowId(rowIds)
    nextRows.push({ id: rowId, rowCount, height: rowHeight, items: rowItems })
    total += rowCount
  }
  return nextRows
}

interface WindowData {
  renderWindow: {
    startRowOffset: number
    endRowOffset: number
    firstRowId?: string
    lastRowId?: string
  }
  pages: {
    items: FolderObjectDTO[]
    meta: {
      nextCursor?: string
      previousCursor?: string
      totalCount: number
    }
  }[]
  rows: {
    id: string
    rowCount: number
    height: number
    items: {
      dimensions: { width: number; height: number }
      item: FolderObjectDTO
    }[]
  }[]
}

class VirtualWindowDataManager {
  private _containerWidth: number
  private readonly windowData: WindowData = {
    pages: [],
    rows: [],
    renderWindow: {
      startRowOffset: 0,
      endRowOffset: 0,
      firstRowId: undefined,
      lastRowId: undefined,
    },
  }

  constructor(containerWidth: number) {
    this._containerWidth = containerWidth
  }

  get pages() {
    return this.windowData.pages
  }

  get rows() {
    return this.windowData.rows
  }

  get renderWindow() {
    return this.windowData.renderWindow
  }

  get containerWidth() {
    return this._containerWidth
  }

  updateContainerWidth(containerWidth: number) {
    this._containerWidth = containerWidth
    const recomputedRows = computeRows(
      containerWidth,
      this.windowData.pages.flatMap((p) => p.items),
    )
    this.windowData.rows = recomputedRows
  }

  addPage(
    page: {
      items: FolderObjectDTO[]
      meta: {
        nextCursor?: string
        previousCursor?: string
        totalCount: number
      }
    },
    startOrEnd: 'start' | 'end',
  ) {
    const start = startOrEnd === 'start'
    const end = !start
    const previousRows = this.windowData.rows
    const previousPages = this.windowData.pages
    const previousRenderWindow = this.windowData.renderWindow

    // Include the adjoining edge row in layout computations to handle incomplete edge rows
    const outerRowToInclude =
      previousRows.at(end ? -1 : 0)?.items.map(({ item }) => item) ?? undefined

    const newItemsToCalculate = [
      ...(start ? page.items : []),
      ...(outerRowToInclude ?? []),
      ...(end ? page.items : []),
    ]

    const rowsToAdd = computeRows(this.containerWidth, newItemsToCalculate)

    const newEndRowOffset =
      previousRenderWindow.endRowOffset +
      (end ? rowsToAdd.length - (outerRowToInclude ? 1 : 0) : 0)
    const newStartRowOffset =
      previousRenderWindow.startRowOffset +
      (start ? rowsToAdd.length - (outerRowToInclude ? 1 : 0) : 0)

    const newRows = [
      ...(start ? rowsToAdd : []),
      ...previousRows.slice(
        start && outerRowToInclude?.length ? 1 : 0,
        end && outerRowToInclude?.length
          ? previousRows.length - 1
          : previousRows.length,
      ),
      ...(end ? rowsToAdd : []),
    ]

    // Adjust render window so rendered items are unchanged
    this.windowData.rows = newRows
    this.windowData.pages = [
      ...(end ? previousPages : []),
      { items: page.items, meta: page.meta },
      ...(start ? previousPages : []),
    ]
    this.windowData.renderWindow =
      previousRows.length === 0
        ? {
            startRowOffset: 0,
            endRowOffset: 0,
            firstRowId: rowsToAdd[0]?.id,
            lastRowId: rowsToAdd.at(-1)?.id,
          }
        : {
            startRowOffset: newStartRowOffset,
            endRowOffset: newEndRowOffset,
            firstRowId: newRows[newStartRowOffset]?.id,
            lastRowId: newRows.at(-newEndRowOffset - 1)?.id,
          }
  }
  handleRenderWindowOffsetDeltas(offsetDeltas: { start: number; end: number }) {
    const firstRenderedIdx = this.rows.findIndex(
      (r) => r.id === this.renderWindow.firstRowId,
    )
    const lastRenderedIdx = this.rows.findIndex(
      (r) => r.id === this.renderWindow.lastRowId,
    )

    let newFirstRowId = this.renderWindow.firstRowId
    let newLastRowId = this.renderWindow.lastRowId

    let spacerDeltaTop = 0
    let spacerDeltaBottom = 0

    if (offsetDeltas.start === 1) {
      const nextIdx = firstRenderedIdx + 1
      newFirstRowId = this.rows[nextIdx]?.id
      spacerDeltaTop += Math.round(
        Math.round((this.rows[firstRenderedIdx]?.height ?? 0) + GRID_GAP_PX),
      )
    } else if (offsetDeltas.start === -1) {
      const prevIdx = firstRenderedIdx - 1
      newFirstRowId = this.rows[prevIdx]?.id
      const prevRowHeight =
        prevIdx >= 0
          ? Math.round((this.rows[prevIdx]?.height ?? 0) + GRID_GAP_PX)
          : 0
      spacerDeltaTop -= Math.round(prevRowHeight)
    }

    if (offsetDeltas.end === 1) {
      const prevIdx = lastRenderedIdx - 1
      newLastRowId = this.rows[prevIdx]?.id
      spacerDeltaBottom += Math.round(
        Math.round((this.rows[lastRenderedIdx]?.height ?? 0) + GRID_GAP_PX),
      )
    } else if (offsetDeltas.end === -1) {
      const nextIdx = lastRenderedIdx + 1
      newLastRowId = this.rows[nextIdx]?.id
      const nextRowHeight =
        nextIdx < this.rows.length
          ? Math.round((this.rows[nextIdx]?.height ?? 0) + GRID_GAP_PX)
          : 0
      spacerDeltaBottom -= Math.round(nextRowHeight)
    }

    console.log('Updating render window with offset deltas:', {
      offsetDeltas,
      endRowOffset:
        this.windowData.renderWindow.endRowOffset + offsetDeltas.end,
      startRowOffset:
        this.windowData.renderWindow.startRowOffset + offsetDeltas.start,
      firstRowId: newFirstRowId,
      lastRowId: newLastRowId,
    })

    this.windowData.renderWindow = {
      endRowOffset:
        this.windowData.renderWindow.endRowOffset + offsetDeltas.end,
      startRowOffset:
        this.windowData.renderWindow.startRowOffset + offsetDeltas.start,
      firstRowId: newFirstRowId,
      lastRowId: newLastRowId,
    }

    return { spacerDeltaTop, spacerDeltaBottom }
  }
}

// Individual grid item component for justified layout
function JustifiedGridItem({
  folderObject,
  fixedSize,
}: {
  folderObject: FolderObjectDTO
  fixedSize?: { width: number; height: number }
}) {
  const [isHovered, setIsHovered] = React.useState(false)

  const fileName =
    folderObject.objectKey.split('/').at(-1) ?? folderObject.objectKey
  const mediaType = mediaTypeFromMimeType(folderObject.mimeType)

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
          { purpose?: string; dimensions?: { width?: number; height?: number } }
        >)
      : {}
  }, [currentObjectContentMetadata])

  // Find the best preview variant for card display
  const getPreviewDimensions = React.useCallback(() => {
    const cardPreview = Object.values(previews).find(
      (preview) => preview.purpose === 'card',
    )
    const listPreview = Object.values(previews).find(
      (preview) => preview.purpose === 'list',
    )

    const preview = cardPreview || listPreview

    if (preview?.dimensions?.width && preview.dimensions.height) {
      return {
        width: preview.dimensions.width,
        height: preview.dimensions.height,
        aspectRatio: preview.dimensions.width / preview.dimensions.height,
      }
    }

    return null
  }, [previews])

  // Hybrid Adaptive Grid sizing for justified layout
  const getGridItemStyle = React.useCallback(() => {
    const previewDims = getPreviewDimensions()

    if (mediaType === MediaType.Image && previewDims) {
      return {
        aspectRatio: previewDims.aspectRatio.toString(),
        minHeight: '150px',
      }
    }

    if (mediaType === MediaType.Video && previewDims) {
      return {
        aspectRatio: previewDims.aspectRatio.toString(),
        minHeight: '150px',
      }
    }

    // Audio: compact fixed aspect ratio
    if (mediaType === MediaType.Audio) {
      return {
        aspectRatio: '16 / 9',
        minHeight: '120px',
      }
    }

    // Documents: medium fixed aspect ratio
    if (mediaType === MediaType.Document) {
      return {
        aspectRatio: '3 / 4',
        minHeight: '180px',
      }
    }

    // Unknown: square fallback
    return {
      aspectRatio: '1 / 1',
      minHeight: '150px',
    }
  }, [mediaType, getPreviewDimensions])

  const displayConfig = React.useMemo(() => {
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
      )}
      style={
        fixedSize
          ? {
              width: `${Math.max(1, Math.round(fixedSize.width))}px`,
              height: `${Math.max(1, Math.round(fixedSize.height))}px`,
            }
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

        {/* Metadata overlay */}
        <div
          className={cn(
            'absolute inset-x-0 bottom-0 p-3 text-white transition-all duration-200',
            isHovered ? 'translate-y-0 opacity-100' : 'translate-y-2 opacity-0',
          )}
        >
          {/* File name */}
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
      </div>
    </Link>
  )
}

export function JustifiedInfiniteGrid({
  folderId,
  initialPageParam = '',
}: {
  folderId: string
  initialPageParam?: string
}) {
  // Cursor-based, windowed pagination state (max 2 pages kept)

  const windowDataManager = React.useRef<VirtualWindowDataManager>(
    new VirtualWindowDataManager(0),
  )

  const [fetchError, setFetchError] = React.useState<Error | null>(null)
  const [isFetching, setIsFetching] = React.useState(false)

  // Virtualization constants
  const PAGE_SIZE = 50
  const VIRTUAL_MARGIN_PX = 300
  const PIXEL_THRESHOLD = 64

  // Scroll management
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)
  const [topSpacerHeight, setTopSpacerHeight] = React.useState(0)
  const [bottomSpacerHeight, setBottomSpacerHeight] = React.useState(0)
  const scrollContainerElem = scrollContainerRef.current

  const fetchPage = React.useRef(async (startOrEnd: 'start' | 'end') => {
    const cursor = !windowDataManager.current.pages.length
      ? initialPageParam
      : startOrEnd === 'start'
        ? windowDataManager.current.pages.at(0)?.meta.previousCursor
        : windowDataManager.current.pages.at(-1)?.meta.nextCursor

    setIsFetching(true)
    await $apiClient
      .GET('/api/v1/folders/{folderId}/objects', {
        params: {
          path: { folderId },
          query: {
            ...(cursor && { cursor }),
            limit: PAGE_SIZE,
            sort: 'filename-asc',
          },
        },
      })
      .then((resp) => {
        if (!isOk(resp)) {
          throw new Error(`Error received from API: ${resp.error.message}`)
        }
        if (scrollContainerRef.current) {
          windowDataManager.current.addPage(
            { items: resp.data.result, meta: resp.data.meta },
            startOrEnd,
          )
        }
      })
      .catch((error: unknown) => {
        setFetchError(error instanceof Error ? error : new Error(String(error)))
      })
      .finally(() => {
        setIsFetching(false)
      })
  })

  const rowContainerRef = React.useRef<HTMLDivElement>(null)

  // rAF throttle for scroll handler
  const rafIdRef = React.useRef<number | null>(null)
  const lastAppliedRef = React.useRef(0)

  // Handle loading more items (for bottom)
  const handleLoadMore = React.useCallback(() => {
    const last = windowDataManager.current.pages.at(-1)
    const nextCursor = last?.meta.nextCursor
    if (nextCursor) {
      void fetchPage.current('end')
    }
  }, [])

  // Handle loading previous items (for top)
  const handleLoadPrevious = React.useCallback(() => {
    const first = windowDataManager.current.pages[0]
    const previousCursor = first?.meta.previousCursor
    if (previousCursor) {
      void fetchPage.current('start')
    }
  }, [])

  const _windowData = windowDataManager.current

  // Handle scroll events
  React.useEffect(() => {
    const container = scrollContainerRef.current
    if (!container) {
      return
    }

    const updateVirtualWindow = () => {
      // Compute window from row metadata and scroll position
      const containerEl = scrollContainerRef.current
      if (!containerEl || windowDataManager.current.rows.length === 0) {
        return
      }

      // Avoid computing cumulative offsets for every row on every scroll; we'll use DOM positions

      // Determine first/last actually rendered rows via DOM children of the rows container
      const rowsContainer = rowContainerRef.current
      const firstEl = rowsContainer?.firstElementChild as HTMLElement | null
      const lastEl = rowsContainer?.lastElementChild as HTMLElement | null
      if (!rowsContainer || !firstEl || !lastEl) {
        return
      }

      const parseRowId = (el: HTMLElement | null): string | null => {
        if (!el || typeof el.id !== 'string') {
          return null
        }
        if (!el.id.startsWith('row-')) {
          return null
        }
        return el.id.slice('row-'.length)
      }

      const firstRenderedId = parseRowId(firstEl)
      const lastRenderedId = parseRowId(lastEl)

      if (!firstRenderedId || !lastRenderedId) {
        return
      }

      // Compute positions using actual DOM measurements relative to the scroll container
      const containerRect = containerEl.getBoundingClientRect()
      const firstRect = firstEl.getBoundingClientRect()
      const lastRect = lastEl.getBoundingClientRect()

      const firstTop = firstRect.top
      const firstHeight = firstRect.height
      const firstBottom = firstTop + firstHeight

      const lastTop = lastRect.top
      const lastHeight = lastRect.height
      const lastBottom = lastTop + lastHeight

      const containerBottom = containerRect.top + containerRect.height
      const containerTop = containerRect.top

      // Compute deltas to omit (trim) or add back rows from start/end based on visibility
      let omitStartDelta = 0
      let omitEndDelta = 0

      // Start side: trim if sufficiently above buffer window, add if there's ample space above and a previous row exists
      if (
        windowDataManager.current.renderWindow.firstRowId === firstRenderedId
      ) {
        if (firstBottom < containerTop - VIRTUAL_MARGIN_PX) {
          omitStartDelta = 1
        } else if (
          firstTop > containerTop - VIRTUAL_MARGIN_PX &&
          windowDataManager.current.rows[0]?.id !==
            windowDataManager.current.renderWindow.firstRowId &&
          windowDataManager.current.renderWindow.startRowOffset > 0
        ) {
          omitStartDelta = -1
        }
      }

      // End side: trim if sufficiently below buffer window, add if there's ample space below and a next row exists
      if (windowDataManager.current.renderWindow.lastRowId === lastRenderedId) {
        if (lastTop > containerBottom + VIRTUAL_MARGIN_PX) {
          omitEndDelta = 1
        } else if (
          lastBottom < containerBottom + VIRTUAL_MARGIN_PX &&
          windowDataManager.current.rows.at(-1)?.id !==
            windowDataManager.current.renderWindow.lastRowId &&
          windowDataManager.current.renderWindow.endRowOffset > 0
        ) {
          omitEndDelta = -1
        }
      }

      // Update render window only if changes are needed
      if (omitStartDelta !== 0 || omitEndDelta !== 0) {
        // Schedule another re-computation of the virtual window which
        // will create a loop that repeats until no more changes are needed.
        setTimeout(updateVirtualWindow, 1)

        const { spacerDeltaBottom, spacerDeltaTop } =
          windowDataManager.current.handleRenderWindowOffsetDeltas({
            start: omitStartDelta,
            end: omitEndDelta,
          })

        if (spacerDeltaTop !== 0) {
          setTopSpacerHeight((prev) => Math.max(0, prev + spacerDeltaTop))
        }
        if (spacerDeltaBottom !== 0) {
          setBottomSpacerHeight((prev) => Math.max(0, prev + spacerDeltaBottom))
        }
      }
    }

    const handleScroll = () => {
      const scrollTop = container.scrollTop
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current)
      }
      rafIdRef.current = requestAnimationFrame(() => {
        if (Math.abs(scrollTop - lastAppliedRef.current) < PIXEL_THRESHOLD) {
          return
        }
        lastAppliedRef.current = scrollTop
        updateVirtualWindow()
      })
    }

    container.addEventListener('scroll', handleScroll, { passive: true })
    // Initial calculation
    lastAppliedRef.current = container.scrollTop
    updateVirtualWindow()
    return () => {
      container.removeEventListener('scroll', handleScroll)
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [scrollContainerElem])

  const [resizeActive, setResizeActive] = React.useState(false)
  const resizeStopTimeoutRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null)
  const lastObservedWidthRef = React.useRef<number | null>(null)
  // Observe container width and recompute justified rows
  React.useEffect(() => {
    if (!scrollContainerElem) {
      return
    }

    // Initialize last observed width so that we only react to actual width changes
    lastObservedWidthRef.current = scrollContainerElem.offsetWidth

    const onResize: ResizeObserverCallback = () => {
      const currentWidth = Math.round(scrollContainerElem.offsetWidth)
      if (
        lastObservedWidthRef.current !== null &&
        currentWidth === Math.round(lastObservedWidthRef.current)
      ) {
        return
      }
      setResizeActive(true)
      lastObservedWidthRef.current = currentWidth
      if (resizeStopTimeoutRef.current != null) {
        clearTimeout(resizeStopTimeoutRef.current)
      }
      resizeStopTimeoutRef.current = setTimeout(() => {
        console.log('updating containerWidth:', currentWidth)
        windowDataManager.current.updateContainerWidth(currentWidth)
        setResizeActive(false)
      }, 250)
    }

    const ro = new ResizeObserver(onResize)
    ro.observe(scrollContainerElem)
    return () => {
      ro.disconnect()
      if (resizeStopTimeoutRef.current != null) {
        setResizeActive(false)
        clearTimeout(resizeStopTimeoutRef.current)
        resizeStopTimeoutRef.current = null
      }
    }
  }, [setResizeActive, scrollContainerElem])

  React.useEffect(() => {
    if (!resizeActive && !isFetching && _windowData.containerWidth > 0) {
      if (
        windowDataManager.current.renderWindow.endRowOffset <= 2 &&
        windowDataManager.current.pages.at(-1)?.meta.nextCursor
      ) {
        void fetchPage.current('end')
      } else if (
        windowDataManager.current.renderWindow.startRowOffset <= 2 &&
        windowDataManager.current.pages.at(0)?.meta.previousCursor
      ) {
        void fetchPage.current('start')
      } else if (windowDataManager.current.pages.length === 0) {
        void fetchPage.current('end')
      }
    }
  }, [
    _windowData.renderWindow.endRowOffset,
    _windowData.renderWindow.startRowOffset,
    _windowData.containerWidth,
    isFetching,
    resizeActive,
  ])

  // Check if we need load more buttons
  const showLoadMoreTop =
    !!windowDataManager.current.pages[0]?.meta.previousCursor
  const showLoadMorebottom =
    !!windowDataManager.current.pages.at(-1)?.meta.nextCursor

  return (
    <>
      <div className="mb-2.5 border border-gray-300 bg-gray-100 p-2.5 font-mono text-xs">
        <div>
          <strong>Query Debug:</strong>
        </div>
        <div>
          Window size rows:{' '}
          {_windowData.rows.length -
            _windowData.renderWindow.startRowOffset -
            _windowData.renderWindow.endRowOffset}
        </div>
        <div>Total rows: {windowDataManager.current.rows.length}</div>
        <div>
          Total items:{' '}
          {windowDataManager.current.pages.flatMap((p) => p.items).length}
        </div>
        <div>Fetched Pages: {windowDataManager.current.pages.length}</div>
        <div>Resize active: {String(resizeActive)}</div>
        <div>
          Render window:{' '}
          {JSON.stringify(windowDataManager.current.renderWindow, null, 2)}
        </div>
        <div>
          All Row Ids:{' '}
          {windowDataManager.current.rows.map((r) => r.id).join(', ')}
        </div>
      </div>

      {/* Justified Grid Layout - Scrollable Container */}
      <div className="relative flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto" ref={scrollContainerRef}>
          <div>
            {/* Error state */}
            {fetchError && (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="mb-4 text-destructive">
                  <FileText className="size-12" />
                </div>
                <div className="mb-2 text-lg font-semibold">
                  Failed to load items
                </div>
                <div className="text-sm text-muted-foreground">
                  {fetchError.message}
                </div>
              </div>
            )}

            {/* Grid of items */}
            {!fetchError && (
              <>
                {windowDataManager.current.pages.length > 0 ? (
                  <>
                    {/* Justified grid with computed rows and item sizes */}
                    <div>
                      {/* Top spacer */}
                      <div style={{ height: topSpacerHeight }} />
                      <div
                        ref={rowContainerRef}
                        className="flex flex-col gap-2"
                      >
                        {!resizeActive &&
                          (() => {
                            const out: React.ReactNode[] = []
                            for (
                              let rowIdx =
                                windowDataManager.current.renderWindow
                                  .startRowOffset;
                              rowIdx <
                              windowDataManager.current.rows.length -
                                windowDataManager.current.renderWindow
                                  .endRowOffset;
                              rowIdx += 1
                            ) {
                              const row =
                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                windowDataManager.current.rows[rowIdx]!
                              const children: React.ReactNode[] = []
                              for (const { item, dimensions } of row.items) {
                                children.push(
                                  <JustifiedGridItem
                                    key={`${item.folderId}-${item.objectKey}`}
                                    folderObject={item}
                                    fixedSize={{
                                      width: dimensions.width,
                                      height: dimensions.height,
                                    }}
                                  />,
                                )
                              }
                              if (children.length > 0) {
                                out.push(
                                  <div
                                    key={row.id}
                                    id={`row-${row.id}`}
                                    className="flex gap-2"
                                  >
                                    {children}
                                  </div>,
                                )
                              }
                            }
                            return out
                          })()}
                      </div>
                      {/* Bottom spacer */}
                      <div style={{ height: bottomSpacerHeight }} />
                    </div>
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <div className="mb-4 text-muted-foreground">
                      <FileText className="size-12" />
                    </div>
                    <div className="text-lg font-semibold">No items found</div>
                    <div className="text-sm text-muted-foreground">
                      This folder appears to be empty
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {resizeActive && (
          <div className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-lg">
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative size-24">
                <div className="absolute inset-0 animate-spin rounded-full border-4 border-primary/30 border-t-transparent" />
                <div className="absolute inset-3 animate-spin rounded-full border-4 border-primary/20 border-b-transparent" />
                <div className="absolute inset-6 animate-spin rounded-full border-4 border-primary/10 border-l-transparent" />
              </div>
            </div>
            <div className="absolute inset-0 animate-pulse bg-primary/10" />
            <div className="absolute inset-0 bg-gradient-to-br from-primary/20 via-primary/10 to-transparent opacity-60" />
          </div>
        )}

        {/* Overlay Load More Buttons */}
        {/* Top Load More Button */}
        {showLoadMoreTop && (
          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2">
            <button
              onClick={handleLoadPrevious}
              disabled={isFetching}
              className={cn(
                'rounded-md bg-primary/90 backdrop-blur-sm px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg',
                'hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-200',
                'border border-white/20',
              )}
            >
              {isFetching ? (
                <div className="flex items-center space-x-2">
                  <div className="size-4 animate-spin rounded-full border border-primary-foreground border-t-transparent" />
                  <span>Loading previous...</span>
                </div>
              ) : (
                'Load Previous Items'
              )}
            </button>
          </div>
        )}

        {/* Bottom Load More Button (overlay) */}
        {showLoadMorebottom && (
          <div className="absolute bottom-4 left-1/2 z-10 -translate-x-1/2">
            <button
              onClick={handleLoadMore}
              disabled={isFetching}
              className={cn(
                'rounded-md bg-primary/90 backdrop-blur-sm px-4 py-2 text-sm font-medium text-primary-foreground shadow-lg',
                'hover:bg-primary focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2',
                'disabled:opacity-50 disabled:cursor-not-allowed',
                'transition-all duration-200',
                'border border-white/20',
              )}
            >
              {isFetching ? (
                <div className="flex items-center space-x-2">
                  <div className="size-4 animate-spin rounded-full border border-primary-foreground border-t-transparent" />
                  <span>Loading more...</span>
                </div>
              ) : (
                'Load More Items'
              )}
            </button>
          </div>
        )}
      </div>
    </>
  )
}
