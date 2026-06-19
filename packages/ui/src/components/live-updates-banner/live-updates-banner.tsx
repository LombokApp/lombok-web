import { Button } from '@lombokapp/ui-toolkit/components/button'
import { cn } from '@lombokapp/ui-toolkit/utils/tailwind'
import { Pause, Play, RefreshCw } from 'lucide-react'

export interface LiveUpdatesBannerProps {
  /** Number of coalesced changes awaiting application. */
  pendingCount: number
  paused: boolean
  onPauseToggle: () => void
  /** Apply pending changes (refetch / reload). */
  onRefresh: () => void
  className?: string
  /** Singular/plural noun for the change count, e.g. "change" → "3 changes". */
  noun?: string
}

/**
 * Slim inline bar for socket-driven updates that shouldn't auto-apply (large or
 * scrolled lists, bursty streams). Renders nothing when idle. Lets the user
 * refresh on demand and pause/resume live updates.
 */
export const LiveUpdatesBanner = ({
  pendingCount,
  paused,
  onPauseToggle,
  onRefresh,
  className,
  noun = 'change',
}: LiveUpdatesBannerProps) => {
  if (pendingCount === 0 && !paused) {
    return null
  }

  return (
    <div
      className={cn(
        'flex items-center justify-between gap-2 rounded-md border border-border bg-muted/60 px-3 py-1.5 text-sm',
        className,
      )}
    >
      <span className="text-muted-foreground">
        {pendingCount > 0
          ? `${pendingCount} new ${noun}${pendingCount === 1 ? '' : 's'}`
          : 'Live updates paused'}
      </span>
      <div className="flex items-center gap-1">
        {pendingCount > 0 && (
          <Button size="sm" variant="ghost" onClick={onRefresh}>
            <RefreshCw className="mr-1.5 size-3.5" />
            Refresh
          </Button>
        )}
        <Button
          size="sm"
          variant="ghost"
          onClick={onPauseToggle}
          aria-label={paused ? 'Resume live updates' : 'Pause live updates'}
        >
          {paused ? (
            <Play className="size-3.5" />
          ) : (
            <Pause className="size-3.5" />
          )}
        </Button>
      </div>
    </div>
  )
}
