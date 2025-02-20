import React from 'react'

import {
  ServerContext,
  type SocketMessageHandler,
} from '../contexts/server.context'

export const useServerContext = (messageHandler?: SocketMessageHandler) => {
  const context = React.useContext(ServerContext)
  const { subscribeToMessages, unsubscribeFromMessages } = context
  React.useEffect(() => {
    if (messageHandler) {
      subscribeToMessages(messageHandler)
    }

    return () => {
      if (messageHandler) {
        unsubscribeFromMessages(messageHandler)
      }
    }
  }, [messageHandler, subscribeToMessages, unsubscribeFromMessages])

  return context
}
