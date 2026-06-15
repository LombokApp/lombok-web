import { Card } from '@lombokapp/ui-toolkit/components/card'
import { cn } from '@lombokapp/ui-toolkit/utils'
import { Search, X } from 'lucide-react'
import React from 'react'

import { getLevelColor } from '@/src/utils/level-utils'

import type { BridgeLogEntry } from './use-bridge-log-stream'

const LEVELS: BridgeLogEntry['level'][] = [
  'debug',
  'info',
  'warn',
  'error',
  'unknown',
]

interface BridgeLogPaneProps {
  entries: BridgeLogEntry[]
  connected: boolean
  selectedSessionId: string | null
  onClearSessionFilter: () => void
  onClear: () => void
}

function entryHaystack(entry: BridgeLogEntry): string {
  return `${entry.msg} ${entry.raw ?? ''} ${
    entry.fields ? JSON.stringify(entry.fields) : ''
  }`.toLowerCase()
}

export function BridgeLogPane({
  entries,
  connected,
  selectedSessionId,
  onClearSessionFilter,
  onClear,
}: BridgeLogPaneProps) {
  const [filter, setFilter] = React.useState('')
  const [paused, setPaused] = React.useState(false)
  const [autoScroll, setAutoScroll] = React.useState(true)
  const [hiddenLevels, setHiddenLevels] = React.useState<Set<string>>(new Set())
  const logRef = React.useRef<HTMLDivElement>(null)

  // While paused, freeze the source; while live, track the latest entries.
  const frozenRef = React.useRef<BridgeLogEntry[]>(entries)
  if (!paused) {
    frozenRef.current = entries
  }
  const source = paused ? frozenRef.current : entries

  const filtered = React.useMemo(() => {
    const lower = filter.toLowerCase()
    return source.filter((e) => {
      if (selectedSessionId && e.fields?.sessionId !== selectedSessionId) {
        return false
      }
      if (hiddenLevels.has(e.level)) {
        return false
      }
      if (lower && !entryHaystack(e).includes(lower)) {
        return false
      }
      return true
    })
  }, [source, filter, selectedSessionId, hiddenLevels])

  // Newest first: render reversed so the latest line sits at the top.
  const ordered = React.useMemo(() => filtered.slice().reverse(), [filtered])

  React.useEffect(() => {
    if (autoScroll && logRef.current) {
      logRef.current.scrollTop = 0
    }
  }, [ordered, autoScroll])

  const handleScroll = React.useCallback(() => {
    if (!logRef.current) {
      return
    }
    setAutoScroll(logRef.current.scrollTop < 40)
  }, [])

  const toggleLevel = (level: string) => {
    setHiddenLevels((prev) => {
      const next = new Set(prev)
      if (next.has(level)) {
        next.delete(level)
      } else {
        next.add(level)
      }
      return next
    })
  }

  return (
    <Card className="flex min-h-0 flex-1 flex-col gap-2 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <span className="flex items-center gap-1.5 text-sm font-semibold">
          <span
            className={cn(
              'size-2 rounded-full',
              connected ? 'bg-green-500' : 'bg-zinc-400',
            )}
          />
          Bridge logs
        </span>

        <div className="flex items-center gap-1 rounded border border-border bg-background px-2 py-1">
          <Search className="size-3 text-muted-foreground" />
          <input
            type="text"
            className="w-40 border-none bg-transparent text-xs text-foreground outline-none placeholder:text-muted-foreground"
            placeholder="Filter..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-1">
          {LEVELS.map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => toggleLevel(level)}
              className={cn(
                'flex items-center gap-1 rounded border px-1.5 py-0.5 text-[0.65rem] uppercase',
                hiddenLevels.has(level)
                  ? 'border-border bg-background text-muted-foreground/50 line-through'
                  : 'border-border bg-background text-muted-foreground',
              )}
            >
              <span
                className={cn(
                  'size-2 rounded-full',
                  getLevelColor(level.toUpperCase()),
                )}
              />
              {level}
            </button>
          ))}
        </div>

        {selectedSessionId && (
          <button
            type="button"
            onClick={onClearSessionFilter}
            className="flex items-center gap-1 rounded border border-blue-500/40 bg-blue-500/10 px-1.5 py-0.5 text-[0.65rem] text-blue-500"
          >
            session {selectedSessionId.slice(0, 8)}
            <X className="size-3" />
          </button>
        )}

        <button
          type="button"
          className={cn(
            'cursor-pointer rounded border px-2 py-1 text-xs',
            paused
              ? 'border-amber-500/40 bg-amber-500/20 text-amber-500'
              : 'border-border bg-background text-muted-foreground',
          )}
          onClick={() => setPaused(!paused)}
        >
          {paused ? 'Resume' : 'Pause'}
        </button>

        <button
          type="button"
          className="cursor-pointer rounded border border-border bg-background px-2 py-1 text-xs text-muted-foreground"
          onClick={onClear}
        >
          Clear
        </button>

        <span className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
          {filtered.length} lines
          {paused && <span className="text-amber-500">(paused)</span>}
        </span>
      </div>

      <div
        ref={logRef}
        className="min-h-0 flex-1 overflow-y-auto rounded border border-border bg-background p-2 font-mono text-[0.7rem] leading-relaxed"
        style={{ minHeight: '320px' }}
        onScroll={handleScroll}
      >
        {ordered.length === 0 ? (
          <span className="text-muted-foreground">
            {connected ? 'No log entries' : 'Connecting...'}
          </span>
        ) : (
          ordered.map((entry) => (
            <div key={entry.seq} className="flex gap-2 hover:bg-muted/30">
              <span className="shrink-0 text-muted-foreground/60">
                {new Date(entry.ts).toLocaleTimeString()}
              </span>
              <span
                className={cn(
                  'h-3.5 w-1 shrink-0 self-center rounded-full',
                  getLevelColor(entry.level.toUpperCase()),
                )}
              />
              <span className="whitespace-pre-wrap break-all text-foreground">
                {entry.msg}
                {entry.fields && Object.keys(entry.fields).length > 0 && (
                  <span className="text-muted-foreground/70">
                    {' '}
                    {JSON.stringify(entry.fields)}
                  </span>
                )}
              </span>
            </div>
          ))
        )}
      </div>

      {!autoScroll && ordered.length > 0 && (
        <button
          type="button"
          className="cursor-pointer self-center border-none bg-transparent p-0 text-xs text-blue-500 hover:underline"
          onClick={() => {
            setAutoScroll(true)
            if (logRef.current) {
              logRef.current.scrollTop = 0
            }
          }}
        >
          Jump to newest
        </button>
      )}
    </Card>
  )
}
