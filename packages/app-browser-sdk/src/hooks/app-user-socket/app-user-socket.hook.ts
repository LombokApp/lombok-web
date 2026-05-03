import React from 'react'

import {
  AppUserSocketContext,
  type AppUserSocketContextValue,
} from './app-user-socket.context'

export function useAppUserSocket(): AppUserSocketContextValue {
  const ctx = React.useContext(AppUserSocketContext)
  if (!ctx) {
    throw new Error(
      'useAppUserSocket must be used within an AppUserSocketProvider',
    )
  }
  return ctx
}

/**
 * Subscribe to a single raw socket.io event on the `/app-user` namespace.
 * The latest `handler` is always invoked, so callers don't need to memoize.
 */
export function useAppUserSocketEvent<T = unknown>(
  eventName: string | null,
  handler: (payload: T) => void,
): void {
  const { subscribe } = useAppUserSocket()
  const handlerRef = React.useRef(handler)
  handlerRef.current = handler

  React.useEffect(() => {
    if (!eventName) {
      return
    }
    return subscribe(eventName, (payload) => handlerRef.current(payload as T))
  }, [eventName, subscribe])
}

/**
 * Payload shape emitted by the platform when an app emits a custom,
 * user-targeted event via `serverClient.emitEvent`. The socket event name
 * is `app:<emitterIdentifier>:<eventIdentifier>`.
 */
export interface AppEventPayload<TData = Record<string, unknown>> {
  eventId: string
  eventIdentifier: string
  emitterIdentifier: string
  targetUserId: string
  targetLocationFolderId: string | null
  targetLocationObjectKey: string | null
  data: TData
  createdAt: string
}

/**
 * Subscribe to a custom app event broadcast on the `/app-user` socket.
 *
 * The platform fans out events emitted via `serverClient.emitEvent({
 * targetUserId, ... })` to every open browser tab of that user.
 *
 * @param appIdentifier - The emitting app's identifier (e.g. "codicle").
 * @param eventIdentifier - The event name from the worker (e.g. "repo_updated").
 * @param handler - Called with the event payload.
 */
export function useAppEvent<TData = Record<string, unknown>>(
  appIdentifier: string | null,
  eventIdentifier: string | null,
  handler: (payload: AppEventPayload<TData>) => void,
): void {
  const eventName =
    appIdentifier && eventIdentifier
      ? `app:${appIdentifier}:${eventIdentifier}`
      : null
  useAppUserSocketEvent<AppEventPayload<TData>>(eventName, handler)
}
