import type { RealtimeEnvelope, RealtimeResource } from '@lombokapp/types'
import React from 'react'
import type { Socket } from 'socket.io-client'

export interface RealtimeContextValue {
  socket: Socket | null
  connected: boolean
  /** Bumped on every (re)connect — consumers key a catch-up resync off this. */
  reconnectCount: number
  /** Subscribe to all envelopes for a resource. Returns an unsubscribe disposer. */
  subscribe: (
    resource: RealtimeResource,
    handler: (envelope: RealtimeEnvelope) => void,
  ) => () => void
  /** Join a folder room (ref-counted, ACL-gated server-side). Returns a leave disposer. */
  joinRoom: (folderId: string) => () => void
}

export const RealtimeContext = React.createContext<RealtimeContextValue>({
  socket: null,
  connected: false,
  reconnectCount: 0,
  subscribe: () => () => undefined,
  joinRoom: () => () => undefined,
})
