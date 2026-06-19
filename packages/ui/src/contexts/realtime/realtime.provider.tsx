import { useAuthContext } from '@lombokapp/auth-utils'
import type { RealtimeEnvelope, RealtimeResource } from '@lombokapp/types'
import { REALTIME_EVENT } from '@lombokapp/types'
import React from 'react'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

import { RealtimeContext } from './realtime.context'

/**
 * Single app-wide authenticated `/user` socket.io connection.
 *
 * - reconnection is ON; rooms are replayed and `reconnectCount` bumped on connect
 * - every envelope arrives under the single REALTIME_EVENT name and is fanned out
 *   to subscribers keyed by `event.resource`
 * - folder rooms are ref-counted so overlapping subscribers don't race the
 *   subscribe/unsubscribe handshake
 */
export const RealtimeProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const authContext = useAuthContext()
  const viewerId = authContext.viewer?.id
  // Hold getAccessToken in a ref so its identity churn doesn't tear down the socket.
  const getAccessTokenRef = React.useRef(authContext.getAccessToken)
  getAccessTokenRef.current = authContext.getAccessToken

  const socketRef = React.useRef<Socket | null>(null)
  const listenersRef = React.useRef<
    Map<RealtimeResource, Set<(envelope: RealtimeEnvelope) => void>>
  >(new Map())
  const roomsRef = React.useRef<Map<string, number>>(new Map())

  const [socket, setSocket] = React.useState<Socket | null>(null)
  const [connected, setConnected] = React.useState(false)
  const [reconnectCount, setReconnectCount] = React.useState(0)

  React.useEffect(() => {
    if (typeof window === 'undefined') {
      return
    }
    const configuredBaseURL = import.meta.env.VITE_BACKEND_HOST ?? ''
    const baseURL = configuredBaseURL.length
      ? configuredBaseURL
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`

    const s = io(`${baseURL}/user`, {
      transports: ['websocket'],
      reconnection: true,
      // Auth callback runs on each (re)connect, so rotated tokens are picked up.
      auth: (cb: (data: Record<string, unknown>) => void) => {
        void getAccessTokenRef.current().then((token) => {
          cb({ userId: viewerId, token })
        })
      },
    })

    s.on('connect', () => {
      setConnected(true)
      setReconnectCount((c) => c + 1)
      // Re-join every room we held (membership is lost across a reconnect).
      for (const folderId of roomsRef.current.keys()) {
        s.emit('subscribe', { folderId })
      }
    })
    s.on('disconnect', () => setConnected(false))

    // Single listener; fan out to resource-keyed subscribers.
    s.on(REALTIME_EVENT, (envelope: RealtimeEnvelope) => {
      const set = listenersRef.current.get(envelope.event.resource)
      if (!set) {
        return
      }
      for (const handler of set) {
        handler(envelope)
      }
    })

    socketRef.current = s
    setSocket(s)

    return () => {
      s.disconnect()
      socketRef.current = null
      setSocket(null)
      setConnected(false)
    }
  }, [viewerId])

  const subscribe = React.useCallback(
    (
      resource: RealtimeResource,
      handler: (envelope: RealtimeEnvelope) => void,
    ) => {
      const map = listenersRef.current
      let handlers = map.get(resource)
      if (!handlers) {
        handlers = new Set()
        map.set(resource, handlers)
      }
      handlers.add(handler)
      return () => {
        const set = listenersRef.current.get(resource)
        if (!set) {
          return
        }
        set.delete(handler)
        if (set.size === 0) {
          listenersRef.current.delete(resource)
        }
      }
    },
    [],
  )

  const joinRoom = React.useCallback((folderId: string) => {
    const rooms = roomsRef.current
    const count = rooms.get(folderId) ?? 0
    rooms.set(folderId, count + 1)
    if (count === 0 && socketRef.current?.connected) {
      socketRef.current.emit('subscribe', { folderId })
    }
    return () => {
      const current = roomsRef.current.get(folderId) ?? 0
      if (current <= 1) {
        roomsRef.current.delete(folderId)
        if (socketRef.current?.connected) {
          socketRef.current.emit('unsubscribe', { folderId })
        }
      } else {
        roomsRef.current.set(folderId, current - 1)
      }
    }
  }, [])

  const value = React.useMemo(
    () => ({ socket, connected, reconnectCount, subscribe, joinRoom }),
    [socket, connected, reconnectCount, subscribe, joinRoom],
  )

  return (
    <RealtimeContext.Provider value={value}>
      {children}
    </RealtimeContext.Provider>
  )
}
