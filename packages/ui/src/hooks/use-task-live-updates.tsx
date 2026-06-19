import type { QueryKey } from '@tanstack/react-query'

import { useLiveQuery } from '@/src/contexts/realtime'

/**
 * Invalidate a task's query whenever a realtime task update for it arrives.
 */
export const useTaskLiveUpdates = (
  taskId: string | undefined,
  queryKey: QueryKey,
) => {
  useLiveQuery({
    resources: ['folder.task', 'server.task'],
    match: (envelope) => 'id' in envelope.event && envelope.event.id === taskId,
    queryKey,
    mode: 'invalidate',
    enabled: !!taskId,
  })
}
