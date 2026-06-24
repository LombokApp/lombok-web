import { useAuthContext } from '@lombokapp/auth-utils'
import type {
  ElaboratedTargetLocationContext,
  JsonSerializableObject,
  TaskWithLocationContextDTO,
} from '@lombokapp/types'
import { Badge } from '@lombokapp/ui-toolkit/components/badge'
import { Button } from '@lombokapp/ui-toolkit/components/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@lombokapp/ui-toolkit/components/card'
import { Progress } from '@lombokapp/ui-toolkit/components/progress'
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from '@lombokapp/ui-toolkit/components/tabs'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@lombokapp/ui-toolkit/components/tooltip'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import {
  AlertCircle,
  Check,
  CheckCircle2,
  ChevronRight,
  Circle,
  Code,
  Copy,
  Zap,
} from 'lucide-react'
import React from 'react'
import { Link } from 'react-router'

import { DateDisplay } from '@/src/components/date-display'
import { copyToClipboard } from '@/src/utils/clipboard'

interface TaskDetailUIProps {
  taskData: TaskWithLocationContextDTO | undefined
  isLoading: boolean
  isError: boolean
}

interface ErrorNode {
  id: string
  path: string
  label: string
  error: JsonSerializableObject
}

type ProgressReport = NonNullable<
  TaskWithLocationContextDTO['progressReports']
>[number]
type ProgressMessageLevel = NonNullable<ProgressReport['message']>['level']

type TimelineEntry =
  | { kind: 'created'; at: string }
  | { kind: 'started'; at: string }
  | {
      kind: 'progress'
      at: string
      report: ProgressReport
    }
  | { kind: 'completed'; at: string }
  | { kind: 'failed'; at: string }

const ERROR_CHAIN_LIMIT = 8

const PROGRESS_TIMELINE_DEFAULT_LIMIT = 50

const progressLevelStyles: Record<
  ProgressMessageLevel,
  { circle: string; text: string }
> = {
  debug: {
    circle: 'bg-muted text-muted-foreground',
    text: 'text-muted-foreground',
  },
  info: {
    circle: 'bg-blue-100 text-blue-600',
    text: 'text-foreground',
  },
  warn: {
    circle: 'bg-amber-100 text-amber-700',
    text: 'text-amber-700',
  },
  error: {
    circle: 'bg-red-100 text-red-600',
    text: 'text-destructive',
  },
}

const formatProgressDetails = (
  details: ProgressReport['details'],
): string | undefined => {
  if (!details) {
    return undefined
  }
  const parts: string[] = []
  if (details.label) {
    parts.push(details.label)
  }
  if (typeof details.percent === 'number') {
    parts.push(`${Math.round(details.percent)}%`)
  } else if (
    typeof details.current === 'number' &&
    typeof details.total === 'number'
  ) {
    parts.push(`${details.current} / ${details.total}`)
  }
  return parts.length ? parts.join(' · ') : undefined
}

const isJsonObject = (value: unknown): value is JsonSerializableObject =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

const isElaboratedTargetLocationContext = (
  value: unknown,
): value is ElaboratedTargetLocationContext =>
  isJsonObject(value) &&
  typeof value.folderId === 'string' &&
  typeof value.folderName === 'string' &&
  typeof value.folderOwnerId === 'string' &&
  (value.objectKey === undefined || typeof value.objectKey === 'string')

const getPrimitiveText = (value: unknown) => {
  if (value === undefined) {
    return undefined
  }

  if (value === null) {
    return 'null'
  }

  if (
    typeof value === 'string' ||
    typeof value === 'number' ||
    typeof value === 'boolean'
  ) {
    return String(value)
  }

  return undefined
}

const findNestedCause = (error: JsonSerializableObject) => {
  const directCause = error.cause

  if (isJsonObject(directCause)) {
    return { cause: directCause, path: 'cause' }
  }

  const details = error.details

  if (isJsonObject(details)) {
    const detailsCause = details.cause

    if (isJsonObject(detailsCause)) {
      return { cause: detailsCause, path: 'details.cause' }
    }
  }

  return undefined
}

const buildErrorChain = (root: JsonSerializableObject): ErrorNode[] => {
  const chain: ErrorNode[] = []
  let current: JsonSerializableObject | undefined = root
  let currentPath = 'error'
  let depth = 0

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (current && depth < ERROR_CHAIN_LIMIT) {
    const label =
      getPrimitiveText(current.code) ??
      getPrimitiveText(current.name) ??
      `Error ${depth + 1}`

    chain.push({
      id: `error-${depth}`,
      path: currentPath,
      label,
      error: current,
    })

    const nextCause = findNestedCause(current)

    if (!nextCause) {
      break
    }

    current = nextCause.cause
    currentPath = `${currentPath}.${nextCause.path}`
    depth += 1
  }

  return chain
}

// Copy button with feedback
function CopyButton({
  value,
  label,
  size = 'sm',
  variant = 'ghost',
}: {
  value: string
  label?: string
  size?: 'sm' | 'xs'
  variant?: 'ghost' | 'outline'
}) {
  const [copied, setCopied] = React.useState(false)

  const handleCopy = () => {
    void copyToClipboard(value).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  const iconSize = size === 'xs' ? 'size-3' : 'size-4'
  const buttonSize = size === 'xs' ? 'h-6 px-2' : 'h-8 px-3'

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={variant}
            size="sm"
            className={cn(
              buttonSize,
              'gap-1.5 text-xs',
              copied && 'text-green-600',
            )}
            onClick={handleCopy}
          >
            {copied ? (
              <Check className={iconSize} />
            ) : (
              <Copy className={iconSize} />
            )}
            {label && <span>{label}</span>}
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{copied ? 'Copied!' : 'Copy to clipboard'}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}

// Error breadcrumb navigation
function ErrorBreadcrumbs({
  chain,
  activeIndex,
  onSelect,
}: {
  chain: ErrorNode[]
  activeIndex: number
  onSelect: (index: number) => void
}) {
  if (chain.length <= 1) {
    return null
  }

  return (
    <div className="flex items-center gap-1 overflow-x-auto pb-2">
      {chain.map((node, index) => {
        const isActive = index === activeIndex
        const isLast = index === chain.length - 1

        return (
          <React.Fragment key={node.id}>
            <button
              type="button"
              onClick={() => onSelect(index)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all w-none',
                isActive
                  ? 'bg-destructive text-destructive-foreground shadow-sm'
                  : 'bg-muted text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <span
                className={cn(
                  'flex size-4 items-center justify-center rounded-full text-[10px] font-bold border rounded-full',
                  isActive
                    ? 'text-destructive-foreground border-foreground/40'
                    : 'text-muted-foreground/50 border-foreground/10',
                )}
              >
                {index + 1}
              </span>
              <span className="max-w-[300px] truncate">{node.label}</span>
            </button>
            {!isLast && (
              <ChevronRight className="size-3 shrink-0 text-muted-foreground/50" />
            )}
          </React.Fragment>
        )
      })}
    </div>
  )
}

// Code block with copy button
function CodeBlock({
  className,
  content,
  language = 'text',
}: {
  className?: string
  content: string
  language?: string
}) {
  return (
    <div className={cn('group relative w-full', className)}>
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton value={content} size="xs" variant="outline" />
      </div>
      <div className={cn('w-full rounded-lg')}>
        <pre
          className={cn(
            'rounded-lg p-4 font-mono text-xs border border-destructive/20 bg-destructive/5 text-destructive leading-relaxed',
            'overflow-x-auto',
            'w-full',
          )}
          data-language={language}
        >
          <code>{content}</code>
        </pre>
      </div>
    </div>
  )
}

// Individual error detail view
function ErrorDetailView({ error }: { error: JsonSerializableObject }) {
  const message = getPrimitiveText(error.message)
  const stack = getPrimitiveText(error.stack)
  const name = getPrimitiveText(error.name)
  const code = getPrimitiveText(error.code)
  const details = isJsonObject(error.details) ? error.details : undefined

  const hasStack = Boolean(stack)
  const hasDetails = Boolean(details)

  // Determine which tabs to show
  const availableTabs: string[] = ['message']
  if (hasStack) {
    availableTabs.push('stacktrace')
  }
  if (hasDetails) {
    availableTabs.push('details')
  }
  availableTabs.push('raw')

  return (
    <div className="space-y-4">
      {/* Tabbed content */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="flex items-center justify-between gap-4">
          <TabsList className="h-9">
            <TabsTrigger value="overview" className="gap-1.5 text-xs">
              <AlertCircle className="size-3.5" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="raw" className="gap-1.5 text-xs">
              <Code className="size-3.5" />
              Raw
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview" className="mt-4">
          {message ? (
            <div className="space-y-3">
              <div className="group relative">
                <div className="absolute right-3 top-3 opacity-0 transition-opacity group-hover:opacity-100">
                  <CopyButton value={message} size="xs" variant="outline" />
                </div>
                <div className="flex flex-col gap-4 rounded-lg border border-destructive/20 bg-destructive/5 p-4 dark:border-destructive/40">
                  <div>
                    <h5 className="text-xs text-foreground/75">Name</h5>
                    <p className="pr-12 font-mono text-sm leading-relaxed text-destructive">
                      {name}
                    </p>
                  </div>
                  <div>
                    <h5 className="text-xs text-foreground/75">Code</h5>
                    <p className="pr-12 font-mono text-sm leading-relaxed text-destructive">
                      {code}
                    </p>
                  </div>
                  <div>
                    <h5 className="text-xs text-foreground">Message</h5>
                    <p className="pr-12 font-mono text-sm leading-relaxed text-destructive">
                      {message}
                    </p>
                  </div>
                  {hasDetails && (
                    <div>
                      <h5 className="text-xs text-foreground/75">Details</h5>
                      <pre className="font-mono text-sm leading-relaxed text-destructive">
                        {JSON.stringify(details, null, 2)}
                      </pre>
                    </div>
                  )}
                  {hasStack && (
                    <div>
                      <h5 className="text-xs text-foreground/75">Stack</h5>
                      <pre className="font-mono text-sm leading-relaxed text-destructive">
                        {stack}
                      </pre>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-lg border border-dashed border-muted-foreground/25 p-8 text-center">
              <p className="text-sm text-muted-foreground">
                No error message available
              </p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="raw" className="mt-4">
          <CodeBlock content={JSON.stringify(error, null, 2)} language="json" />
        </TabsContent>
      </Tabs>
    </div>
  )
}

// Main error display component
function TaskErrorDisplay({
  error,
  errorTime,
}: {
  error: JsonSerializableObject
  errorTime?: string
}) {
  const errorChain = React.useMemo(() => buildErrorChain(error), [error])
  const [selectedIndex, setSelectedIndex] = React.useState(
    errorChain.length - 1,
  )

  React.useEffect(() => {
    setSelectedIndex(errorChain.length - 1)
  }, [errorChain])

  if (!errorChain.length) {
    return (
      <div className="rounded-lg border border-dashed border-muted-foreground/25 p-8 text-center">
        <AlertCircle className="mx-auto size-8 text-muted-foreground/50" />
        <p className="mt-2 text-sm text-muted-foreground">
          No error information available
        </p>
      </div>
    )
  }

  const activeIndex =
    selectedIndex >= 0 && selectedIndex < errorChain.length ? selectedIndex : 0
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const selected = errorChain[activeIndex]!
  const selectedError = selected.error
  const primaryMessage = getPrimitiveText(selectedError.message)
  const primaryCode = getPrimitiveText(selectedError.code)

  // Build a full error report for copying
  const buildErrorReport = () => {
    const lines: string[] = []
    lines.push('=== Error Report ===')
    lines.push('')

    if (errorTime) {
      lines.push(`Time: ${errorTime}`)
    }

    lines.push(`Primary Error: ${primaryCode ?? 'UNKNOWN'}`)
    if (primaryMessage) {
      lines.push(`Message: ${primaryMessage}`)
    }

    lines.push('')
    lines.push('--- Error Chain ---')

    errorChain.forEach((node, index) => {
      const msg = getPrimitiveText(node.error.message)
      lines.push(`${index + 1}. ${node.label}${msg ? `: ${msg}` : ''}`)
    })

    lines.push('')
    lines.push('--- Full Error Object ---')
    lines.push(JSON.stringify(error, null, 2))

    return lines.join('\n')
  }

  return (
    <div className="space-y-6">
      {/* Hero section - the primary error */}
      <div className="rounded-xl border border-destructive/30 bg-gradient-to-br from-destructive/10 via-destructive/5 to-transparent p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-destructive/15">
              <AlertCircle className="size-6 text-destructive" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <Badge
                  tone="danger"
                  className="font-mono text-xs font-semibold"
                >
                  {primaryCode ?? 'ERROR'}
                </Badge>
                {errorTime && (
                  <span className="text-xs text-muted-foreground">
                    <DateDisplay date={errorTime} showTimeSince={true} />
                  </span>
                )}
              </div>
              {primaryMessage && (
                <p className="mt-2 font-mono text-sm leading-relaxed text-foreground">
                  {primaryMessage}
                </p>
              )}
              {errorChain.length > 1 && (
                <p className="mt-2 text-xs text-muted-foreground">
                  {errorChain.length} errors in chain — root cause at the end
                </p>
              )}
            </div>
          </div>
          <CopyButton
            value={buildErrorReport()}
            label="Copy Report"
            size="sm"
            variant="outline"
          />
        </div>
      </div>

      {/* Error chain navigation */}
      {errorChain.length > 1 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Error Chain
          </p>
          <ErrorBreadcrumbs
            chain={errorChain}
            activeIndex={activeIndex}
            onSelect={setSelectedIndex}
          />
        </div>
      )}

      {/* Selected error details */}
      <div className="space-y-3">
        {errorChain.length > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
              Details
            </p>
            <span className="text-xs text-muted-foreground">
              Level {activeIndex + 1} of {errorChain.length}
            </span>
          </div>
        )}
        <ErrorDetailView error={selectedError} />
      </div>
    </div>
  )
}

function TaskProgressView({
  progress,
  latestReport,
}: {
  progress?: TaskWithLocationContextDTO['progress']
  latestReport?: ProgressReport
}) {
  const percent =
    typeof progress?.percent === 'number'
      ? Math.max(0, Math.min(100, progress.percent))
      : undefined
  const hasCounts =
    typeof progress?.current === 'number' && typeof progress.total === 'number'

  const messageLevel: ProgressMessageLevel =
    latestReport?.message?.level ?? 'info'
  const messageStyles = progressLevelStyles[messageLevel]

  return (
    <div className="space-y-3">
      {typeof percent === 'number' ? (
        <div className="space-y-1">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>{progress?.label ?? 'Progress'}</span>
            <span className="font-mono">{Math.round(percent)}%</span>
          </div>
          <Progress value={percent} className="h-2" />
        </div>
      ) : (
        progress?.label && (
          <p className="text-sm font-medium">{progress.label}</p>
        )
      )}
      {hasCounts && (
        <p className="text-xs text-muted-foreground">
          {progress.current} / {progress.total}
        </p>
      )}
      {latestReport?.message?.text && (
        <div className="rounded-md border bg-muted/30 p-3">
          <div className="mb-1 flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
            <span
              className={cn(
                'size-2 rounded-full',
                messageStyles.circle.split(' ')[0],
              )}
            />
            <span>{latestReport.message.level}</span>
            {latestReport.code && (
              <>
                <span>·</span>
                <span className="font-mono">{latestReport.code}</span>
              </>
            )}
          </div>
          <p
            className={cn(
              'whitespace-pre-wrap break-words text-sm',
              messageStyles.text,
            )}
          >
            {latestReport.message.text}
          </p>
        </div>
      )}
      {!latestReport && !progress && (
        <p className="text-sm text-muted-foreground">
          Waiting for progress updates...
        </p>
      )}
    </div>
  )
}

function TimelineRow({
  circleClassName,
  icon,
  label,
  at,
}: {
  circleClassName: string
  icon: React.ReactNode
  label: string
  at: string
}) {
  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          'flex size-8 items-center justify-center rounded-full',
          circleClassName,
        )}
      >
        {icon}
      </div>
      <div className="flex-1">
        <p className="text-sm font-medium">{label}</p>
        <div className="text-sm text-muted-foreground">
          <DateDisplay date={at} showTimeSince={false} />
        </div>
      </div>
    </div>
  )
}

function TaskTimeline({ entries }: { entries: TimelineEntry[] }) {
  const progressIndices = React.useMemo(() => {
    const indices: number[] = []
    entries.forEach((entry, index) => {
      if (entry.kind === 'progress') {
        indices.push(index)
      }
    })
    return indices
  }, [entries])

  const [showAllProgress, setShowAllProgress] = React.useState(false)
  const overLimit = progressIndices.length > PROGRESS_TIMELINE_DEFAULT_LIMIT
  const hiddenProgressIndexSet = React.useMemo(() => {
    if (!overLimit || showAllProgress) {
      return new Set<number>()
    }
    const keepCount = PROGRESS_TIMELINE_DEFAULT_LIMIT
    const hidden = new Set<number>()
    const cutoff = progressIndices.length - keepCount
    for (let i = 0; i < cutoff; i++) {
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      hidden.add(progressIndices[i]!)
    }
    return hidden
  }, [overLimit, showAllProgress, progressIndices])

  const hiddenCount = hiddenProgressIndexSet.size
  let collapsedRendered = false

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => {
        if (hiddenProgressIndexSet.has(index)) {
          if (collapsedRendered) {
            return null
          }
          collapsedRendered = true
          return (
            <div
              key="collapsed-progress"
              className="flex items-center gap-4 text-xs text-muted-foreground"
            >
              <div className="flex size-8 items-center justify-center rounded-full border border-dashed border-muted-foreground/40">
                <Circle className="size-3" />
              </div>
              <button
                type="button"
                onClick={() => setShowAllProgress(true)}
                className="text-primary hover:underline"
              >
                Show {hiddenCount} earlier progress update
                {hiddenCount === 1 ? '' : 's'}
              </button>
            </div>
          )
        }

        if (entry.kind === 'created') {
          return (
            <TimelineRow
              key={`created-${entry.at}`}
              circleClassName="bg-blue-100 text-blue-600"
              icon={
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              }
              label="Task Created"
              at={entry.at}
            />
          )
        }

        if (entry.kind === 'started') {
          return (
            <TimelineRow
              key={`started-${entry.at}`}
              circleClassName="bg-yellow-100 text-yellow-600"
              icon={
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              }
              label="Task Started"
              at={entry.at}
            />
          )
        }

        if (entry.kind === 'completed') {
          return (
            <TimelineRow
              key={`completed-${entry.at}`}
              circleClassName="bg-green-100 text-green-600"
              icon={
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              }
              label="Task Completed"
              at={entry.at}
            />
          )
        }

        if (entry.kind === 'failed') {
          return (
            <TimelineRow
              key={`failed-${entry.at}`}
              circleClassName="bg-red-100 text-red-600"
              icon={
                <svg
                  className="size-4"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                  />
                </svg>
              }
              label="Task Failed"
              at={entry.at}
            />
          )
        }

        const level: ProgressMessageLevel =
          entry.report.message?.level ?? 'info'
        const styles = progressLevelStyles[level]
        const detailSummary = formatProgressDetails(entry.report.details)
        const text = entry.report.message?.text
        const code = entry.report.code

        return (
          <div
            key={`progress-${index}-${entry.at}`}
            className="flex items-start gap-4"
          >
            <div
              className={cn(
                'flex size-8 items-center justify-center rounded-full',
                styles.circle,
              )}
            >
              <Circle className="size-2 fill-current" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                {code && (
                  <span className="font-mono text-xs text-muted-foreground">
                    {code}
                  </span>
                )}
                {detailSummary && (
                  <span className="text-xs text-muted-foreground">
                    {detailSummary}
                  </span>
                )}
              </div>
              {text && (
                <p
                  className={cn(
                    'mt-0.5 whitespace-pre-wrap break-words text-sm',
                    styles.text,
                  )}
                >
                  {text}
                </p>
              )}
              <div className="mt-0.5 text-xs text-muted-foreground">
                <DateDisplay date={entry.at} showTimeSince={false} />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function TaskResultView({
  result,
}: {
  // Display-only (JSON.stringify); accepts the openapi-fetch client's flattened
  // arbitrary-JSON object type, which isn't the recursive JsonSerializableObject.
  result?: Record<string, unknown> | undefined
}) {
  const hasResult = result !== undefined && Object.keys(result).length > 0

  if (!hasResult) {
    return <p className="text-sm text-muted-foreground">No result data</p>
  }

  const json = JSON.stringify(result, null, 2)

  return (
    <div className="group relative">
      <div className="absolute right-2 top-2 opacity-0 transition-opacity group-hover:opacity-100">
        <CopyButton value={json} size="xs" variant="outline" />
      </div>
      <pre className="overflow-x-auto rounded-md bg-muted/50 p-3 font-mono text-sm">
        {json}
      </pre>
    </div>
  )
}

export function TaskDetailUI({
  taskData,
  isLoading,
  isError,
}: TaskDetailUIProps) {
  const authContext = useAuthContext()
  const currentUserId = authContext.viewer?.id

  // Get the appropriate color for the status indicator
  const getStatusColor = (task?: TaskWithLocationContextDTO) => {
    if (!task) {
      return 'bg-gray-600'
    }

    if (task.completedAt && task.success) {
      return 'bg-green-600'
    } else if (task.completedAt && !task.success) {
      return 'bg-red-600'
    } else if (!task.startedAt) {
      return 'bg-gray-600'
    } else {
      return 'bg-yellow-600'
    }
  }

  // Get the status text and badge variant
  const getStatusInfo = (task?: TaskWithLocationContextDTO) => {
    if (!task) {
      return { text: 'Unknown', badgeProps: { variant: 'soft' as const } }
    }

    if (task.completedAt && task.success) {
      return { text: 'Complete', badgeProps: { variant: 'solid' as const } }
    } else if (task.completedAt && !task.success) {
      return { text: 'Failed', badgeProps: { tone: 'danger' as const } }
    } else if (!task.startedAt) {
      return { text: 'Pending', badgeProps: { variant: 'soft' as const } }
    } else {
      return { text: 'Running', badgeProps: { variant: 'outline' as const } }
    }
  }

  if (isLoading) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          <p className="text-muted-foreground">Loading task details...</p>
        </div>
      </div>
    )
  }

  if (isError) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-destructive/10 p-3">
            <svg
              className="size-6 text-destructive"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
              />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold text-destructive">
              Failed to load task details
            </h3>
            <p className="text-muted-foreground">Please try again later</p>
          </div>
        </div>
      </div>
    )
  }

  if (!taskData) {
    return (
      <div className="flex h-full flex-1 flex-col items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="rounded-full bg-muted p-3">
            <svg
              className="size-6 text-muted-foreground"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.47-.881-6.08-2.33"
              />
            </svg>
          </div>
          <div className="text-center">
            <h3 className="text-lg font-semibold">Task not found</h3>
            <p className="text-muted-foreground">
              The requested task could not be found
            </p>
          </div>
        </div>
      </div>
    )
  }

  // Check if the current user owns the folder
  let folderName: string | undefined
  let folderOwnerId: string | undefined
  const targetContext: unknown = taskData.targetLocationContext

  if (isElaboratedTargetLocationContext(targetContext)) {
    folderName = targetContext.folderName
    folderOwnerId = targetContext.folderOwnerId
  }

  const isFolderOwner = Boolean(
    currentUserId && folderOwnerId && currentUserId === folderOwnerId,
  )

  const folderLabel = folderName ?? taskData.targetLocation?.folderId

  const statusInfo = getStatusInfo(taskData)
  const errorPayload =
    taskData.success === false
      ? (taskData.error ??
        (() => {
          const errorLog = [...taskData.systemLog]
            .reverse()
            .find((log) => log.logType === 'error')
          return errorLog?.payload?.error
        })())
      : undefined

  const errorToDisplay =
    taskData.success === false
      ? isJsonObject(errorPayload)
        ? errorPayload
        : {
            code: 'UNKNOWN',
            message: getPrimitiveText(errorPayload) ?? 'No message available',
            stack: 'No stacktrace available',
          }
      : undefined

  const progressReports = taskData.progressReports ?? []
  const latestReport: ProgressReport | undefined =
    progressReports.length > 0
      ? progressReports[progressReports.length - 1]
      : undefined
  const isRunning = Boolean(taskData.startedAt) && !taskData.completedAt
  const showProgressCard =
    isRunning && (Boolean(taskData.progress) || progressReports.length > 0)

  const timelineEntries: TimelineEntry[] = [
    { kind: 'created' as const, at: taskData.createdAt },
    ...(taskData.startedAt
      ? [{ kind: 'started' as const, at: taskData.startedAt }]
      : []),
    ...progressReports.map<TimelineEntry>((report) => ({
      kind: 'progress' as const,
      at: report.receivedAt,
      report,
    })),
    ...(taskData.completedAt
      ? [
          taskData.success === false
            ? { kind: 'failed' as const, at: taskData.completedAt }
            : { kind: 'completed' as const, at: taskData.completedAt },
        ]
      : []),
  ].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))

  const result = taskData.success ? taskData.result : undefined

  return (
    <div className={cn('flex h-full flex-1 flex-col items-center')}>
      <div className="container flex flex-1 flex-col">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="mb-2 flex items-center gap-3">
                <h1 className="text-3xl font-bold tracking-tight">
                  {taskData.taskIdentifier}
                </h1>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <div
                    className={cn(
                      'h-2 w-2 rounded-full',
                      getStatusColor(taskData),
                    )}
                  />
                  <Badge {...statusInfo.badgeProps}>{statusInfo.text}</Badge>
                </div>
                <span>•</span>
                <span className="font-mono">ID: {taskData.id}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6">
          {/* Task Information and Timeline Row */}
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Task Information Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                  Task Information
                </CardTitle>
                <CardDescription>Basic details about this task</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Description
                    </label>
                    <p className="mt-1 rounded-md bg-muted/50 p-3 font-mono text-sm">
                      {taskData.taskDescription}
                    </p>
                  </div>
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Handler
                      </label>
                      <p className="mt-1 font-mono text-sm">
                        {taskData.handlerIdentifier}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Owner
                      </label>
                      <p className="mt-1 font-mono text-sm">
                        {taskData.ownerId}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Created
                      </label>
                      <div className="mt-1 text-sm">
                        <DateDisplay
                          date={taskData.createdAt}
                          showTimeSince={true}
                        />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Updated
                      </label>
                      <div className="mt-1 text-sm">
                        <DateDisplay
                          date={taskData.updatedAt}
                          showTimeSince={true}
                        />
                      </div>
                    </div>
                  </div>
                  {taskData.targetLocation && (
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Folder / Object
                      </label>
                      <div className="mt-1 space-y-1">
                        <p className="text-sm font-medium">
                          Folder:{' '}
                          {isFolderOwner ? (
                            <Link
                              to={`/folders/${taskData.targetLocation.folderId}`}
                              className="text-primary hover:underline"
                            >
                              {folderLabel}
                            </Link>
                          ) : (
                            <span>{folderLabel}</span>
                          )}
                        </p>
                        {taskData.targetLocation.objectKey && (
                          <p className="text-sm text-muted-foreground">
                            Object:{' '}
                            {isFolderOwner ? (
                              <Link
                                to={`/folders/${taskData.targetLocation.folderId}/objects/${taskData.targetLocation.objectKey}`}
                                className="text-primary hover:underline"
                              >
                                {taskData.targetLocation.objectKey}
                              </Link>
                            ) : (
                              <span>{taskData.targetLocation.objectKey}</span>
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  )}
                  {taskData.targetLocation?.objectKey &&
                    !taskData.targetLocationContext && (
                      <div>
                        <label className="text-sm font-medium text-muted-foreground">
                          Object Key
                        </label>
                        <p className="mt-1 break-all font-mono text-sm">
                          {taskData.targetLocation.objectKey}
                        </p>
                      </div>
                    )}
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="text-sm font-medium text-muted-foreground">
                        Trigger
                      </label>
                      <p className="mt-1 break-all font-mono text-sm">
                        {taskData.invocation.kind}
                      </p>
                    </div>
                    {taskData.targetLocation?.folderId &&
                      !taskData.targetLocationContext && (
                        <div>
                          <label className="text-sm font-medium text-muted-foreground">
                            Subject Folder ID
                          </label>
                          <p className="mt-1 break-all font-mono text-sm">
                            {taskData.targetLocation.folderId}
                          </p>
                        </div>
                      )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">
                      Input Data
                    </label>
                    <div className="mt-1 rounded-md bg-muted/50 p-3">
                      <pre className="overflow-x-auto font-mono text-sm">
                        {JSON.stringify(taskData.data, null, 2)}
                      </pre>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Timeline Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <svg
                    className="size-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                  Timeline
                </CardTitle>
                <CardDescription>Task execution timeline</CardDescription>
              </CardHeader>
              <CardContent>
                <TaskTimeline entries={timelineEntries} />
              </CardContent>
            </Card>
          </div>

          {/* Progress Card */}
          {showProgressCard && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="size-5 text-yellow-600" />
                  Progress
                </CardTitle>
                <CardDescription>Latest update from the task</CardDescription>
              </CardHeader>
              <CardContent>
                <TaskProgressView
                  progress={taskData.progress}
                  latestReport={latestReport}
                />
              </CardContent>
            </Card>
          )}

          {/* Result Card */}
          {taskData.success === true && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle2 className="size-5 text-green-600" />
                  Result
                </CardTitle>
                <CardDescription>
                  Output produced by the completed task
                </CardDescription>
              </CardHeader>
              <CardContent>
                <TaskResultView result={result} />
              </CardContent>
            </Card>
          )}

          {/* Error Information Card */}
          {taskData.success === false && errorToDisplay && (
            <Card className="overflow-hidden border-destructive/20">
              <CardHeader className="border-b border-destructive/10 bg-destructive/5">
                <CardTitle className="flex items-center gap-2 text-destructive">
                  <AlertCircle className="size-5" />
                  Task Failed
                </CardTitle>
                <CardDescription className="text-destructive/70">
                  Detailed error information and debugging data
                </CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                <TaskErrorDisplay
                  error={errorToDisplay}
                  errorTime={taskData.completedAt}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
