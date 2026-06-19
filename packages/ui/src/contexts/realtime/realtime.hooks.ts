import type { RealtimeEnvelope, RealtimeResource } from '@lombokapp/types'
import React from 'react'

import { RealtimeContext } from './realtime.context'

export const useRealtime = () => React.useContext(RealtimeContext)

/**
 * Subscribe to a realtime resource. The handler is held in a ref so callers
 * don't need to memoize it (re-subscription only happens if `resource` changes).
 */
export const useRealtimeEvent = (
  resource: RealtimeResource,
  handler: (envelope: RealtimeEnvelope) => void,
) => {
  const { subscribe } = useRealtime()
  const handlerRef = React.useRef(handler)
  handlerRef.current = handler

  React.useEffect(() => {
    return subscribe(resource, (envelope) => handlerRef.current(envelope))
  }, [subscribe, resource])
}

/** Join a folder room for the lifetime of the calling component (ref-counted). */
export const useRealtimeRoom = (folderId: string | undefined) => {
  const { joinRoom } = useRealtime()
  React.useEffect(() => {
    if (!folderId) {
      return
    }
    return joinRoom(folderId)
  }, [joinRoom, folderId])
}
