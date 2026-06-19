import type { RealtimeEnvelope, RealtimeResource } from '@lombokapp/types'
import type { DebouncedFunction } from '@lombokapp/utils'
import { debounce } from '@lombokapp/utils'
import type { QueryClient, QueryKey } from '@tanstack/react-query'
import { useQueryClient } from '@tanstack/react-query'
import React from 'react'

import { useRealtime } from './realtime.hooks'

export type LiveQueryMode = 'invalidate' | 'pending' | 'patch'

export interface UseLiveQueryOptions {
  /** Resource(s) to react to, e.g. ['folder.object']. */
  resources: RealtimeResource[]
  /** Optional filter, e.g. (env) => env.event.id === taskId. */
  match?: (envelope: RealtimeEnvelope) => boolean
  /** invalidate (default): debounced refetch. pending: count only, manual apply(). patch: setQueryData/data-manager. */
  mode?: LiveQueryMode
  /** Required for 'invalidate' and 'pending'. */
  queryKey?: QueryKey
  /** Required for 'patch'. Called per accumulated envelope inside one batch. */
  patch?: (envelope: RealtimeEnvelope, queryClient: QueryClient) => void
  /** Extra work on socket reconnect (e.g. reset a custom store). */
  onReconnect?: () => void
  debounceMs?: number
  maxWaitMs?: number
  enabled?: boolean
}

export interface UseLiveQueryResult {
  /** Coalesced events awaiting application (drives the refresh banner). */
  pendingCount: number
  /** Flush pending now (refetch / apply patches). */
  apply: () => void
  paused: boolean
  setPaused: (paused: boolean) => void
}

/**
 * Declarative bridge from realtime events to a TanStack query reaction:
 * subscribe to resource(s), filter, then react in one of three modes — with
 * burst coalescing and an optional user-gated pause.
 */
export const useLiveQuery = (
  options: UseLiveQueryOptions,
): UseLiveQueryResult => {
  const {
    resources,
    debounceMs = 250,
    maxWaitMs = 2000,
    enabled = true,
  } = options
  const { subscribe, reconnectCount } = useRealtime()
  const queryClient = useQueryClient()

  const [pendingCount, setPendingCount] = React.useState(0)
  const [paused, setPausedState] = React.useState(false)

  const pendingRef = React.useRef<RealtimeEnvelope[]>([])
  const pausedRef = React.useRef(false)
  const optionsRef = React.useRef(options)
  optionsRef.current = options

  const flush = React.useCallback(() => {
    const envelopes = pendingRef.current
    pendingRef.current = []
    setPendingCount(0)
    if (envelopes.length === 0) {
      return
    }
    const { mode = 'invalidate', queryKey, patch } = optionsRef.current
    if (mode === 'patch') {
      if (patch) {
        for (const envelope of envelopes) {
          patch(envelope, queryClient)
        }
      }
    } else if (queryKey) {
      void queryClient.invalidateQueries({ queryKey })
    }
  }, [queryClient])

  const debouncedFlushRef = React.useRef<DebouncedFunction<[]> | undefined>(
    undefined,
  )
  React.useEffect(() => {
    const debounced = debounce(() => flush(), debounceMs, {
      maxWait: maxWaitMs,
    })
    debouncedFlushRef.current = debounced
    return () => debounced.cancel()
  }, [flush, debounceMs, maxWaitMs])

  // Stable envelope handler held in a ref so resource subscriptions don't churn.
  const onEnvelopeRef = React.useRef<(envelope: RealtimeEnvelope) => void>(
    () => undefined,
  )
  onEnvelopeRef.current = (envelope: RealtimeEnvelope) => {
    const { match, mode = 'invalidate' } = optionsRef.current
    if (match && !match(envelope)) {
      return
    }
    pendingRef.current.push(envelope)
    setPendingCount((count) => count + 1)
    if (pausedRef.current || mode === 'pending') {
      return
    }
    debouncedFlushRef.current?.()
  }

  const resourcesKey = resources.join(',')
  React.useEffect(() => {
    if (!enabled) {
      return
    }
    const list = resourcesKey.split(',').filter(Boolean) as RealtimeResource[]
    const disposers = list.map((resource) =>
      subscribe(resource, (envelope) => onEnvelopeRef.current(envelope)),
    )
    return () => disposers.forEach((dispose) => dispose())
  }, [subscribe, resourcesKey, enabled])

  // Catch-up resync on actual reconnects (not the initial connect or a late mount).
  const prevReconnectRef = React.useRef(reconnectCount)
  React.useEffect(() => {
    if (reconnectCount === prevReconnectRef.current) {
      return
    }
    prevReconnectRef.current = reconnectCount
    if (reconnectCount <= 1) {
      return
    }
    const { mode = 'invalidate', queryKey, onReconnect } = optionsRef.current
    onReconnect?.()
    pendingRef.current = []
    setPendingCount(0)
    if (mode !== 'patch' && queryKey) {
      void queryClient.invalidateQueries({ queryKey })
    }
  }, [reconnectCount, queryClient])

  const apply = React.useCallback(() => {
    debouncedFlushRef.current?.cancel()
    flush()
  }, [flush])

  const setPaused = React.useCallback(
    (next: boolean) => {
      pausedRef.current = next
      setPausedState(next)
      if (!next) {
        debouncedFlushRef.current?.cancel()
        flush()
      }
    },
    [flush],
  )

  return { pendingCount, apply, paused, setPaused }
}
