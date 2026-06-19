import type { RealtimeEnvelope, RealtimeResource } from '@lombokapp/types'
import type { QueryKey } from '@tanstack/react-query'

import { useLiveQuery } from '@/src/contexts/realtime'

import { LiveUpdatesBanner } from './live-updates-banner'

export interface LiveTableBannerProps {
  resources: RealtimeResource[]
  match?: (envelope: RealtimeEnvelope) => boolean
  /** List query key to invalidate when the user refreshes. */
  queryKey: QueryKey
  noun?: string
  className?: string
  enabled?: boolean
}

/**
 * Drop-in "N changes — refresh" banner for paginated list/table views: listens
 * for the given realtime resources in `pending` mode (never auto-refetches, so
 * filters/scroll/page are preserved) and refetches only when the user clicks.
 */
export const LiveTableBanner = ({
  resources,
  match,
  queryKey,
  noun,
  className,
  enabled,
}: LiveTableBannerProps) => {
  const live = useLiveQuery({
    resources,
    match,
    queryKey,
    mode: 'pending',
    enabled,
  })
  return (
    <LiveUpdatesBanner
      pendingCount={live.pendingCount}
      paused={live.paused}
      onPauseToggle={() => live.setPaused(!live.paused)}
      onRefresh={live.apply}
      noun={noun}
      className={className}
    />
  )
}
