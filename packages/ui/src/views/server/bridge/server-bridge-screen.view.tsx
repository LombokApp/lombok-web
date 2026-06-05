import { cn } from '@lombokapp/ui-toolkit/utils'
import React from 'react'

import { $api } from '@/src/services/api'

import { BridgeLogPane } from './bridge-log-pane'
import { BridgeSessionsTable } from './bridge-sessions-table'
import type { BridgeLogEntry } from './use-bridge-log-stream'
import { useBridgeLogStream } from './use-bridge-log-stream'

export function ServerBridgeScreen() {
  const [selectedSessionId, setSelectedSessionId] = React.useState<
    string | null
  >(null)

  const sessionsQuery = $api.useQuery(
    'get',
    '/api/v1/server/docker-sessions',
    {},
    { refetchInterval: 5000 },
  )

  // Nudge the sessions table to refetch when the live log stream reports a
  // session-lifecycle line — coalesced so a burst triggers one refetch.
  const refetchRef = React.useRef(sessionsQuery.refetch)
  refetchRef.current = sessionsQuery.refetch
  const nudgeRef = React.useRef<ReturnType<typeof setTimeout> | undefined>(
    undefined,
  )
  const onEntry = React.useCallback((entry: BridgeLogEntry) => {
    if (!entry.fields || !('sessionId' in entry.fields)) {
      return
    }
    if (nudgeRef.current) {
      return
    }
    nudgeRef.current = setTimeout(() => {
      nudgeRef.current = undefined
      void refetchRef.current()
    }, 250)
  }, [])
  React.useEffect(
    () => () => {
      if (nudgeRef.current) {
        clearTimeout(nudgeRef.current)
      }
    },
    [],
  )

  const { entries, connected, clear } = useBridgeLogStream(onEntry)
  const sessions = sessionsQuery.data?.result ?? []

  return (
    <div className={cn('flex h-full flex-1 flex-col gap-6')}>
      <div>
        <h1 className="text-2xl font-semibold">Docker Bridge</h1>
        <p className="text-sm text-muted-foreground">
          Live tunnel sessions and the bridge process log stream.
        </p>
      </div>

      <BridgeSessionsTable
        sessions={sessions}
        selectedSessionId={selectedSessionId}
        onSelectSession={setSelectedSessionId}
      />

      <BridgeLogPane
        entries={entries}
        connected={connected}
        selectedSessionId={selectedSessionId}
        onClearSessionFilter={() => setSelectedSessionId(null)}
        onClear={clear}
      />
    </div>
  )
}
