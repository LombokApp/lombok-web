import { type FolderObjectDTO } from '@lombokapp/types'
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

import { FolderObjectPreview } from '../../folder-object-preview/folder-object-preview.view'

// eslint-disable-next-line @typescript-eslint/no-inferrable-types
const QUERY_DEBUG: boolean = false
const GRID_GAP_PX = 8
const maxRowHeight = 300

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
  return fnv1a32(ids.join(','))
}

const getPreviewDims = (
  item: FolderObjectDTO,
): { w?: number; h?: number; ar: number } => {
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

// Deterministic splitter using dynamic programming on a symmetric cost.
// - Direction invariant for the same slice (uses canonical forward order)
// - Preserves item order; only chooses row boundaries
// - Applies the last-row height cap only after breaks are chosen
const computeRowsDeterministic = (
  containerWidth: number,
  items: {
    folderObject: FolderObjectDTO
    page: {
      cursor: string
      items: FolderObjectDTO[]
      meta: {
        nextCursor?: string
        previousCursor?: string
        totalCount: number
      }
    }
    nativeDimensions: {
      w?: number
      h?: number
      ar: number
    }
  }[],
  options?: { capLastRow?: boolean },
): {
  id: string
  rowCount: number
  height: number
  items: {
    page: {
      cursor: string
      items: FolderObjectDTO[]
      meta: {
        nextCursor?: string
        previousCursor?: string
        totalCount: number
      }
    }
    nativeDimensions: { w?: number; h?: number; ar: number }
    computedDimensions: { width: number; height: number }
    folderObject: FolderObjectDTO
  }[]
}[] => {
  const capLastRow = options?.capLastRow !== false

  if (containerWidth <= 0 || items.length === 0) {
    return []
  }

  // Canonicalize to a stable forward order independent of input direction.
  // We sort by objectKey (API uses filename-asc) and fall back to id.
  const canonical = [...items].sort((a, b) => {
    const ak = a.folderObject.objectKey
    const bk = b.folderObject.objectKey
    if (ak !== bk) {
      return ak.localeCompare(bk)
    }
    return a.folderObject.id.localeCompare(b.folderObject.id)
  })

  const n = canonical.length
  const ar: number[] = new Array<number>(n)
  for (let i = 0; i < n; i += 1) {
    ar[i] = canonical[i]?.nativeDimensions.ar ?? 1
  }

  // Prefix sums of aspect ratios for O(1) range sum
  const pref: number[] = new Array<number>(n + 1)
  pref[0] = 0
  for (let i = 0; i < n; i += 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    pref[i + 1] = pref[i]! + ar[i]!
  }

  const targetHeight = maxRowHeight
  const computeHeight = (i: number, j: number): number => {
    const count = j - i + 1
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const sumAR = pref[j + 1]! - pref[i]!
    return (
      (containerWidth - GRID_GAP_PX * Math.max(0, count - 1)) /
      Math.max(0.0001, sumAR)
    )
  }

  // Symmetric cost around target height; tie-break by earlier break
  const cost = (i: number, j: number): number => {
    const h = computeHeight(i, j)
    const d = h - targetHeight
    return d * d
  }

  const dp: number[] = new Array<number>(n + 1).fill(Number.POSITIVE_INFINITY)
  const prev: number[] = new Array<number>(n + 1).fill(-1)
  dp[0] = 0
  for (let k = 1; k <= n; k += 1) {
    // Evaluate all previous breaks i -> (i..k-1)
    for (let i = 0; i < k; i += 1) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      const c = dp[i]! + cost(i, k - 1)
      if (
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        c < dp[k]! - 1e-12 ||
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        (Math.abs(c - dp[k]!) <= 1e-12 && i < prev[k]!)
      ) {
        dp[k] = c
        prev[k] = i
      }
    }
  }

  // Reconstruct segments [i..j]
  const segments: { start: number; end: number }[] = []
  let k = n
  while (k > 0) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const i = prev[k]!
    if (i < 0) {
      break
    }
    segments.push({ start: i, end: k - 1 })
    k = i
  }
  segments.reverse()

  // Build rows; apply last-row cap after choosing breaks
  const rows: {
    id: string
    rowCount: number
    height: number
    items: {
      page: {
        cursor: string
        items: FolderObjectDTO[]
        meta: {
          nextCursor?: string
          previousCursor?: string
          totalCount: number
        }
      }
      nativeDimensions: { w?: number; h?: number; ar: number }
      computedDimensions: { width: number; height: number }
      folderObject: FolderObjectDTO
    }[]
  }[] = []

  for (let s = 0; s < segments.length; s += 1) {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const { start, end } = segments[s]!
    const rowItemsSource = canonical.slice(start, end + 1)
    let rowHeight = computeHeight(start, end)
    const isLast = s === segments.length - 1
    if (capLastRow && isLast && rowHeight > targetHeight) {
      rowHeight = targetHeight
    }

    const rowItems = rowItemsSource.map((it) => ({
      ...it,
      computedDimensions: {
        width: it.nativeDimensions.ar * rowHeight,
        height: rowHeight,
      },
    }))

    const rowId = deterministicRowId(rowItems.map((r) => r.folderObject.id))

    rows.push({
      id: rowId,
      rowCount: rowItems.length,
      height: rowHeight,
      items: rowItems,
    })
  }

  return rows
}

interface Row {
  id: string
  rowCount: number
  height: number
  items: {
    nativeDimensions: { w?: number; h?: number; ar: number }
    computedDimensions: { width: number; height: number }
    folderObject: FolderObjectDTO
    page: {
      cursor: string
      items: FolderObjectDTO[]
      meta: {
        nextCursor?: string
        previousCursor?: string
        totalCount: number
      }
    }
  }[]
}
interface WindowData {
  renderWindow: {
    startRowOffset: number
    endRowOffset: number
    firstRowId: string
    lastRowId: string
  }
  pages: {
    cursor: string
    items: FolderObjectDTO[]
    meta: {
      nextCursor?: string
      previousCursor?: string
      totalCount: number
    }
  }[]
  rows: Row[]
  rowMap: Record<string, { row: Row; index: number }>
}

class VirtualWindowDataManager {
  private readonly windowData: WindowData = {
    pages: [],
    rows: [],
    rowMap: {},
    renderWindow: {
      startRowOffset: 0,
      endRowOffset: 0,
      firstRowId: '',
      lastRowId: '',
    },
  }

  constructor(
    private _containerWidth: number,
    private readonly updateCallback: () => void,
  ) {}

  get pages() {
    return this.windowData.pages
  }

  get rows() {
    return this.windowData.rows
  }

  get rowsMap() {
    return this.windowData.rowMap
  }

  get renderWindow() {
    return this.windowData.renderWindow
  }

  get containerWidth() {
    return this._containerWidth
  }

  updateContainerWidth(containerWidth: number) {
    this._containerWidth = containerWidth
    const recomputedRows = computeRowsDeterministic(
      containerWidth,
      this.windowData.rows.flatMap((p) =>
        p.items.map((item) => ({ ...item, page: item.page })),
      ),
      { capLastRow: false },
    )

    this.windowData.rows = recomputedRows
    this.windowData.rowMap = this.windowData.rows.reduce<
      Record<string, { row: Row; index: number }>
    >((acc, row, i) => {
      acc[row.id] = { row, index: i }
      return acc
    }, {})

    this.windowData.renderWindow = {
      firstRowId: this.windowData.rows[0]?.id ?? '',
      lastRowId: this.windowData.rows.at(-1)?.id ?? '',
      startRowOffset: 0,
      endRowOffset: 0,
    }
    this.updateCallback()
  }

  resetData() {
    this.windowData.pages = []
    this.windowData.rows = []
    this.windowData.rowMap = {}
    this.windowData.renderWindow = {
      startRowOffset: 0,
      endRowOffset: 0,
      firstRowId: '',
      lastRowId: '',
    }
  }

  addPage(
    cursor: string,
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
    const adjoiningRow =
      previousRows
        .at(end ? -1 : 0)
        ?.items.map((item) => item)
        // Filter out items that are from this same incoming page
        // which might exist because we only remove whole rows when
        // trimming, ignoring rows that span a page boundary.
        .filter(
          (item) =>
            page.items.findIndex((i) => i.id === item.folderObject.id) === -1,
        ) ?? []

    const incomingItems = page.items.map((folderObject) => ({
      page: { cursor, items: page.items, meta: page.meta },
      folderObject,
      nativeDimensions: getPreviewDims(folderObject),
    }))

    const newItemsToCalculate = [
      ...(start ? incomingItems : []),
      ...adjoiningRow,
      ...(end ? incomingItems : []),
    ]

    const rowsToAdd = computeRowsDeterministic(
      this.containerWidth,
      newItemsToCalculate,
      { capLastRow: end ? !page.meta.nextCursor : false },
    )

    const newEndRowOffset =
      previousRenderWindow.endRowOffset +
      (end ? rowsToAdd.length - (adjoiningRow.length ? 1 : 0) : 0)
    const newStartRowOffset =
      previousRenderWindow.startRowOffset +
      (start ? rowsToAdd.length - (adjoiningRow.length ? 1 : 0) : 0)

    const newRows = [
      ...(start ? rowsToAdd : []),
      ...previousRows.slice(
        start && adjoiningRow.length ? 1 : 0,
        end && adjoiningRow.length
          ? previousRows.length - 1
          : previousRows.length,
      ),
      ...(end ? rowsToAdd : []),
    ]

    // Adjust render window so rendered items are unchanged
    this.windowData.rows = newRows
    this.windowData.rowMap = this.windowData.rows.reduce<
      Record<string, { row: Row; index: number }>
    >((acc, row, i) => {
      acc[row.id] = { row, index: i }
      return acc
    }, {})

    const newPages = [
      ...(end ? previousPages : []),
      { cursor, ...page },
      ...(start ? previousPages : []),
    ]

    this.windowData.pages = newPages

    this.windowData.renderWindow =
      previousRows.length === 0
        ? {
            startRowOffset: 0,
            endRowOffset: 0,
            firstRowId: rowsToAdd[0]?.id ?? '',
            lastRowId: rowsToAdd.at(-1)?.id ?? '',
          }
        : {
            startRowOffset: newStartRowOffset,
            endRowOffset: newEndRowOffset,
            firstRowId: newRows[newStartRowOffset]?.id ?? '',
            lastRowId: newRows.at(-newEndRowOffset - 1)?.id ?? '',
          }
    this.updateCallback()
  }

  discardPage(startOrEnd: 'start' | 'end') {
    const page = this.pages.at(startOrEnd === 'start' ? 0 : -1)

    let rowsToDiscard = 0
    for (const row of startOrEnd === 'start'
      ? this.rows
      : [...this.rows].reverse()) {
      // Only remove rows that only contain items from the page being removed (no rows that contain page boundaries)
      if (!row.items.find((item) => item.page.cursor !== page?.cursor)) {
        rowsToDiscard += 1
      } else {
        break
      }
    }

    const rowsSliceStartIndexAndCount =
      startOrEnd === 'start'
        ? [rowsToDiscard]
        : [0, this.windowData.rows.length - rowsToDiscard]

    this.windowData.rows = this.windowData.rows.slice(
      ...rowsSliceStartIndexAndCount,
    )
    this.windowData.rowMap = this.windowData.rows.reduce<
      Record<string, { row: Row; index: number }>
    >((acc, row, i) => {
      acc[row.id] = { row, index: i }
      return acc
    }, {})

    this.windowData.pages = this.windowData.pages.slice(
      startOrEnd === 'start' ? 1 : 0,
      startOrEnd === 'start' ? undefined : -1,
    )

    if (startOrEnd === 'start') {
      this.windowData.renderWindow.startRowOffset -= rowsToDiscard
      if (this.windowData.renderWindow.startRowOffset < 0) {
        throw new Error(
          `Violation: row offset cannot be negative: ${this.windowData.renderWindow.startRowOffset}`,
        )
      }
    } else {
      this.windowData.renderWindow.endRowOffset -= rowsToDiscard
      if (this.windowData.renderWindow.endRowOffset < 0) {
        throw new Error(
          `Violation: row offset cannot be negative: ${this.windowData.renderWindow.endRowOffset}`,
        )
      }
    }

    this.updateCallback()
  }

  handleRenderWindowOffsetDeltas(offsetDeltas: { start: number; end: number }) {
    const firstRenderedRow = this.rowsMap[this.renderWindow.firstRowId]
    const lastRenderedRow = this.rowsMap[this.renderWindow.lastRowId]
    if (!firstRenderedRow || !lastRenderedRow) {
      throw new Error('Violation: first or last rendered row not found')
    }

    let newFirstRowId = this.renderWindow.firstRowId
    let newLastRowId = this.renderWindow.lastRowId

    if (offsetDeltas.start === 1) {
      const nextIdx = firstRenderedRow.index + 1
      newFirstRowId = this.rows[nextIdx]?.id ?? ''
      const firstRenderedPageIndex = this.pages.findIndex(
        (p) => p.cursor === firstRenderedRow.row.items.at(-1)?.page.cursor,
      )
      if (firstRenderedPageIndex >= 3) {
        this.discardPage('start')
      }
    } else if (offsetDeltas.start === -1) {
      const prevIdx = firstRenderedRow.index - 1
      newFirstRowId = this.rows[prevIdx]?.id ?? ''
    }

    if (offsetDeltas.end === 1) {
      const prevIdx = lastRenderedRow.index - 1
      newLastRowId = this.rows[prevIdx]?.id ?? ''
      const lastRenderedPageIndex = this.pages.findIndex(
        (p) => p.cursor === lastRenderedRow.row.items.at(0)?.page.cursor,
      )
      if (lastRenderedPageIndex <= this.windowData.pages.length - 3) {
        this.discardPage('end')
      }
    } else if (offsetDeltas.end === -1) {
      const nextIdx = lastRenderedRow.index + 1
      newLastRowId = this.rows[nextIdx]?.id ?? ''
    }

    this.windowData.renderWindow = {
      ...this.windowData.renderWindow,
      ...(newFirstRowId && {
        startRowOffset:
          this.windowData.renderWindow.startRowOffset + offsetDeltas.start,
        firstRowId: newFirstRowId,
      }),
      ...(newLastRowId && {
        endRowOffset:
          this.windowData.renderWindow.endRowOffset + offsetDeltas.end,
        lastRowId: newLastRowId,
      }),
    }

    this.updateCallback()
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

    if (mediaType === MediaType.IMAGE && previewDims) {
      return {
        aspectRatio: previewDims.aspectRatio.toString(),
        minHeight: '150px',
      }
    }

    if (mediaType === MediaType.VIDEO && previewDims) {
      return {
        aspectRatio: previewDims.aspectRatio.toString(),
        minHeight: '150px',
      }
    }

    // Audio: compact fixed aspect ratio
    if (mediaType === MediaType.AUDIO) {
      return {
        aspectRatio: '16 / 9',
        minHeight: '120px',
      }
    }

    // Documents: medium fixed aspect ratio
    if (mediaType === MediaType.DOCUMENT) {
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

export function JustifiedObjectsGrid({
  initialPageParam = '',
  onCursorChange,
  onFetchPage,
  fetchParamsKey,
}: {
  fetchParamsKey: number
  onCursorChange: (newCursor: string) => void
  onFetchPage: (cursor: string) => Promise<{
    data: {
      result: FolderObjectDTO[]
      meta: {
        nextCursor?: string
        previousCursor?: string
        totalCount: number
      }
    }
  }>
  initialPageParam?: string
}) {
  const initialCursorRef = React.useRef(initialPageParam)
  const [windowDataChangeKey, updateWindowDataChangeKey] = React.useReducer(
    (key: number) => key + 1,
    0,
  )
  const windowDataManager = React.useRef<VirtualWindowDataManager>(
    new VirtualWindowDataManager(0, updateWindowDataChangeKey),
  )

  const [fetchError, setFetchError] = React.useState<Error | null>(null)
  const [isFetching, setIsFetching] = React.useState(false)
  const isFetchInitialized = React.useRef(false)

  // Virtualization constants
  const VIRTUAL_MARGIN_PX = 1000
  const PIXEL_THRESHOLD = 64

  // Scroll management
  const [scrollContainerElem, setScrollContainerElem] =
    React.useState<HTMLDivElement | null>(null)
  const rowContainerRef = React.useRef<HTMLDivElement>(null)

  const fetchPage = React.useCallback(
    async (startOrEnd: 'start' | 'end') => {
      const cursor = !windowDataManager.current.pages.length
        ? initialCursorRef.current
        : startOrEnd === 'start'
          ? windowDataManager.current.pages.at(0)?.meta.previousCursor
          : windowDataManager.current.pages.at(-1)?.meta.nextCursor

      setIsFetching(true)
      await onFetchPage(cursor ?? '')
        .then((resp) => {
          windowDataManager.current.addPage(
            cursor && resp.data.meta.previousCursor ? cursor : '',
            { items: resp.data.result, meta: resp.data.meta },
            startOrEnd,
          )
        })
        .catch((error: unknown) => {
          setFetchError(
            error instanceof Error ? error : new Error(String(error)),
          )
        })
        .finally(() => {
          setIsFetching(false)
        })
    },
    [onFetchPage],
  )

  // rAF throttle for scroll handler
  const rafIdRef = React.useRef<number | null>(null)
  const lastAppliedRef = React.useRef(0)
  const firstVisibleRowCursorRef = React.useRef<string | null>(null)

  const [firstAndLastRenderedRows, setFirstAndLastRenderedRows] =
    React.useState<{
      first: { element: HTMLElement; offset: number } | null
      last: { element: HTMLElement; offset: number } | null
    }>()

  const updateVirtualWindow = React.useCallback(
    (_scrollContainerElem: HTMLDivElement) => {
      // Compute window from row metadata and scroll position
      if (windowDataManager.current.rows.length === 0) {
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
      const containerRect = _scrollContainerElem.getBoundingClientRect()
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
            windowDataManager.current.renderWindow.firstRowId
        ) {
          if (windowDataManager.current.renderWindow.startRowOffset <= 0) {
            throw new Error(
              `Violation: start row offset cannot be negative: ${windowDataManager.current.renderWindow.startRowOffset}`,
            )
          }
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
          if (windowDataManager.current.renderWindow.endRowOffset <= 0) {
            throw new Error(
              `Violation: end row offset cannot be negative: ${windowDataManager.current.renderWindow.endRowOffset}`,
            )
          }
          omitEndDelta = -1
        }
      }

      // Update render window only if changes are needed
      if (omitStartDelta !== 0 || omitEndDelta !== 0) {
        setFirstAndLastRenderedRows({
          first: { element: firstEl, offset: firstTop },
          last: { element: lastEl, offset: lastTop },
        })
        windowDataManager.current.handleRenderWindowOffsetDeltas({
          start: omitStartDelta,
          end: omitEndDelta,
        })
      }

      // Determine the first row entirely within the container bounds and update the active cursor
      const rowsContainerEl = rowContainerRef.current
      const children = Array.from(rowsContainerEl.children) as HTMLElement[]
      let highestVisibleRowId: string | null = null
      for (const childEl of children) {
        const rect = childEl.getBoundingClientRect()
        if (rect.top >= containerTop) {
          highestVisibleRowId = parseRowId(childEl)
          break
        }
      }
      if (highestVisibleRowId) {
        const row = windowDataManager.current.rowsMap[highestVisibleRowId]?.row
        const rowCursor = row?.items[0]?.page.cursor ?? null
        if (rowCursor !== firstVisibleRowCursorRef.current) {
          firstVisibleRowCursorRef.current = rowCursor
          onCursorChange(rowCursor ?? '')
        }
      }
    },
    [onCursorChange],
  )

  // Make sure updateVirtualWindow is called after any change to window data
  React.useEffect(() => {
    if (scrollContainerElem) {
      updateVirtualWindow(scrollContainerElem)
    }
  }, [windowDataChangeKey, scrollContainerElem, updateVirtualWindow])

  // Handle scroll events
  React.useEffect(() => {
    if (!scrollContainerElem) {
      return
    }

    const handleScroll = () => {
      const scrollTop = scrollContainerElem.scrollTop
      const isAtTop = scrollTop === 0
      const isAtBottom =
        scrollTop + scrollContainerElem.clientHeight >=
        scrollContainerElem.scrollHeight
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current)
      }
      rafIdRef.current = requestAnimationFrame(() => {
        if (
          Math.abs(scrollTop - lastAppliedRef.current) < PIXEL_THRESHOLD &&
          !isAtTop &&
          !isAtBottom
        ) {
          return
        }
        lastAppliedRef.current = scrollTop
        updateVirtualWindow(scrollContainerElem)
      })
    }

    scrollContainerElem.addEventListener('scroll', handleScroll, {
      passive: true,
    })
    // Initial calculation
    lastAppliedRef.current = scrollContainerElem.scrollTop
    updateVirtualWindow(scrollContainerElem)
    return () => {
      scrollContainerElem.removeEventListener('scroll', handleScroll)
      if (rafIdRef.current != null) {
        cancelAnimationFrame(rafIdRef.current)
        rafIdRef.current = null
      }
    }
  }, [scrollContainerElem, updateVirtualWindow])

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

    // TODO: In cases where the container width does not resize during render, this ensures that an
    //       and initial width is set, but in cases where the container width does resize during render,
    //       this will cause the window manager to recompute the rows (usually 0) unnecessarily. Consider
    //       improving this so the first width notification is only sent when width becomes stable.
    windowDataManager.current.updateContainerWidth(lastObservedWidthRef.current)

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
    if (
      !resizeActive &&
      !isFetching &&
      windowDataManager.current.containerWidth > 0
    ) {
      if (
        windowDataManager.current.renderWindow.endRowOffset <= 4 &&
        windowDataManager.current.pages.at(-1)?.meta.nextCursor
      ) {
        void fetchPage('end')
      } else if (
        windowDataManager.current.renderWindow.startRowOffset <= 3 &&
        windowDataManager.current.pages.at(0)?.meta.previousCursor
      ) {
        void fetchPage('start')
      } else if (!isFetchInitialized.current) {
        isFetchInitialized.current = true
        void fetchPage('end')
      }
    }
  }, [windowDataChangeKey, isFetching, resizeActive, fetchPage])

  const resetState = React.useCallback(() => {
    onCursorChange('')
    isFetchInitialized.current = false
    windowDataManager.current.resetData()
    setFetchError(null)
    setIsFetching(false)
    updateWindowDataChangeKey()
    initialCursorRef.current = ''
  }, [updateWindowDataChangeKey, onCursorChange])

  const fetchParamsKeyRef = React.useRef(fetchParamsKey)
  React.useEffect(() => {
    if (fetchParamsKeyRef.current !== fetchParamsKey) {
      fetchParamsKeyRef.current = fetchParamsKey
      resetState()
    }
  }, [fetchParamsKey, resetState])

  React.useLayoutEffect(() => {
    if (scrollContainerElem) {
      if (firstAndLastRenderedRows) {
        let scrollDelta = 0
        if (
          firstAndLastRenderedRows.first &&
          scrollContainerElem.contains(firstAndLastRenderedRows.first.element)
        ) {
          scrollDelta +=
            firstAndLastRenderedRows.first.element.getBoundingClientRect().top -
            firstAndLastRenderedRows.first.offset
        } else if (
          firstAndLastRenderedRows.last &&
          scrollContainerElem.contains(firstAndLastRenderedRows.last.element)
        ) {
          scrollDelta +=
            firstAndLastRenderedRows.last.element.getBoundingClientRect().top -
            firstAndLastRenderedRows.last.offset
        }
        if (scrollDelta !== 0) {
          scrollContainerElem.scrollTop += scrollDelta
        }
      }
    }
  }, [scrollContainerElem, firstAndLastRenderedRows])

  return (
    <>
      {/* Justified Grid Layout - Scrollable Container */}
      <div className="relative flex-1 overflow-hidden">
        {QUERY_DEBUG && (
          <div className="absolute right-0 top-0 z-10 mb-2.5 border border-gray-300 bg-gray-100/80 p-2.5 font-mono text-xs">
            <div>
              <strong>Query Debug:</strong>
            </div>
            <div>
              Window size rows:{' '}
              {windowDataManager.current.rows.length -
                windowDataManager.current.renderWindow.startRowOffset -
                windowDataManager.current.renderWindow.endRowOffset}
            </div>
            <div>Total rows: {windowDataManager.current.rows.length}</div>
            <div>
              Total items:{' '}
              {windowDataManager.current.pages.flatMap((p) => p.items).length}
            </div>
            <div>Fetched Pages: {windowDataManager.current.pages.length}</div>
            <div>Resize active: {String(resizeActive)}</div>
            <div>Active Cursor: {firstVisibleRowCursorRef.current}</div>
            <div>
              Render window offsets:{' '}
              {`start: ${windowDataManager.current.renderWindow.startRowOffset} - end: ${windowDataManager.current.renderWindow.endRowOffset} - firstRowId: ${windowDataManager.current.renderWindow.firstRowId} - lastRowId: ${windowDataManager.current.renderWindow.lastRowId}`}
            </div>
          </div>
        )}

        <div
          className="h-full overflow-y-auto"
          ref={setScrollContainerElem}
          style={{ overflowAnchor: 'none' }}
        >
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
                              for (const {
                                folderObject,
                                computedDimensions,
                              } of row.items) {
                                children.push(
                                  <JustifiedGridItem
                                    key={`${folderObject.folderId}-${folderObject.objectKey}`}
                                    folderObject={folderObject}
                                    fixedSize={{
                                      width: computedDimensions.width,
                                      height: computedDimensions.height,
                                    }}
                                  />,
                                )
                              }
                              if (children.length > 0) {
                                out.push(
                                  <div
                                    key={row.id}
                                    id={`row-${row.id}`}
                                    className="relative flex gap-2"
                                  >
                                    {children}
                                  </div>,
                                )
                              }
                            }
                            return out
                          })()}
                      </div>
                      <div
                        style={{
                          height: `${windowDataManager.current.rowsMap[windowDataManager.current.renderWindow.lastRowId]?.row.items.at(-1)?.page.meta.nextCursor ? 500 : 0}px`,
                        }}
                      />
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
      </div>
    </>
  )
}
