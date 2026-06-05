import { useAuthContext } from '@lombokapp/auth-utils'
import type { components } from '@lombokapp/types'
import React from 'react'

import { basePath } from '@/src/services/api'

export type BridgeLogEntry = components['schemas']['BridgeLogEntry']

const MAX_ENTRIES = 2000
const RECONNECT_DELAY_MS = 2000

interface UseBridgeLogStreamResult {
  entries: BridgeLogEntry[]
  connected: boolean
  clear: () => void
}

/**
 * Streams the docker bridge's NDJSON log endpoint via fetch + ReadableStream.
 * Reconnects with a fixed backoff on drop. `onEntry` fires per live line so the
 * caller can react (e.g. nudge a sessions refetch) without re-subscribing.
 */
export function useBridgeLogStream(
  onEntry?: (entry: BridgeLogEntry) => void,
): UseBridgeLogStreamResult {
  const authContext = useAuthContext()
  const authRef = React.useRef(authContext)
  authRef.current = authContext
  const onEntryRef = React.useRef(onEntry)
  onEntryRef.current = onEntry

  const [entries, setEntries] = React.useState<BridgeLogEntry[]>([])
  const [connected, setConnected] = React.useState(false)

  const clear = React.useCallback(() => setEntries([]), [])

  React.useEffect(() => {
    const abort = new AbortController()
    // Read through a call so flow-analysis doesn't narrow it to a constant.
    const isAborted = (): boolean => abort.signal.aborted
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined

    const connect = async (): Promise<void> => {
      let token: string | undefined
      try {
        token = await authRef.current.getAccessToken()
      } catch {
        token = undefined
      }
      if (isAborted()) {
        return
      }
      try {
        const res = await fetch(
          `${basePath}/api/v1/server/bridge-logs/stream`,
          {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
            signal: abort.signal,
          },
        )
        if (!res.ok || !res.body) {
          throw new Error(`stream failed (${res.status})`)
        }
        setConnected(true)
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let carry = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }
          carry += decoder.decode(value, { stream: true })
          let nl = carry.indexOf('\n')
          const batch: BridgeLogEntry[] = []
          while (nl !== -1) {
            const line = carry.slice(0, nl).trim()
            carry = carry.slice(nl + 1)
            nl = carry.indexOf('\n')
            if (!line) {
              continue // heartbeat
            }
            try {
              const entry = JSON.parse(line) as BridgeLogEntry
              batch.push(entry)
              onEntryRef.current?.(entry)
            } catch {
              // ignore a malformed line
            }
          }
          if (batch.length > 0) {
            setEntries((prev) => {
              const next = prev.concat(batch)
              return next.length > MAX_ENTRIES
                ? next.slice(next.length - MAX_ENTRIES)
                : next
            })
          }
        }
      } catch {
        // aborted or network error — fall through to reconnect
      }
      setConnected(false)
      if (!isAborted()) {
        reconnectTimer = setTimeout(() => void connect(), RECONNECT_DELAY_MS)
      }
    }

    void connect()

    return () => {
      abort.abort()
      if (reconnectTimer) {
        clearTimeout(reconnectTimer)
      }
    }
  }, [])

  return { entries, connected, clear }
}
