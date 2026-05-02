import React from 'react'
import { io, type Socket } from 'socket.io-client'

import { useAppBrowserSdk } from '../app-browser-sdk'
import { AppUserSocketContext } from './app-user-socket.context'

/**
 * Opens an authenticated `/app-user` socket.io connection for the current
 * app + user pair, scoped to the platform host. Provides a single shared
 * connection that all app event hooks subscribe through, so we avoid
 * duplicate sockets per consumer.
 */
export const AppUserSocketProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const { isInitialized, authState, getAccessToken } = useAppBrowserSdk()
  const socketRef = React.useRef<Socket | null>(null)
  const listenersRef = React.useRef<
    Map<string, Set<(payload: unknown) => void>>
  >(new Map())
  const [socket, setSocket] = React.useState<Socket | null>(null)
  const [connected, setConnected] = React.useState(false)
  const [reconnectCount, setReconnectCount] = React.useState(0)

  React.useEffect(() => {
    if (!isInitialized || !authState.isAuthenticated) {
      return
    }

    let cancelled = false
    void (async () => {
      const token = await getAccessToken()
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- set in cleanup
      if (cancelled) {
        return
      }

      const s = io('/app-user', {
        auth: { token },
        transports: ['websocket'],
        reconnection: true,
      })

      s.on('connect', () => {
        setConnected(true)
        setReconnectCount((c) => c + 1)
      })
      s.on('disconnect', () => setConnected(false))

      // Re-attach existing handlers (in case any subscribed before connect).
      for (const [name, handlers] of listenersRef.current) {
        s.on(name, (payload: unknown) => {
          for (const h of handlers) {
            h(payload)
          }
        })
      }

      socketRef.current = s
      setSocket(s)
    })()

    return () => {
      cancelled = true
      socketRef.current?.disconnect()
      socketRef.current = null
      setSocket(null)
      setConnected(false)
    }
  }, [isInitialized, authState.isAuthenticated, getAccessToken])

  const subscribe = React.useCallback(
    (eventName: string, handler: (payload: unknown) => void) => {
      const map = listenersRef.current
      let handlers = map.get(eventName)
      if (!handlers) {
        handlers = new Set()
        map.set(eventName, handlers)
        // First subscriber for this event — bind the socket listener.
        socketRef.current?.on(eventName, (payload: unknown) => {
          const set = listenersRef.current.get(eventName)
          if (!set) {
            return
          }
          for (const h of set) {
            h(payload)
          }
        })
      }
      handlers.add(handler)
      return () => {
        const set = listenersRef.current.get(eventName)
        if (!set) {
          return
        }
        set.delete(handler)
        if (set.size === 0) {
          listenersRef.current.delete(eventName)
          socketRef.current?.off(eventName)
        }
      }
    },
    [],
  )

  const value = React.useMemo(
    () => ({ socket, connected, reconnectCount, subscribe }),
    [socket, connected, reconnectCount, subscribe],
  )

  return (
    <AppUserSocketContext.Provider value={value}>
      {children}
    </AppUserSocketContext.Provider>
  )
}
