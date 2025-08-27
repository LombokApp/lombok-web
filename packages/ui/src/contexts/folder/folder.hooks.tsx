import React from 'react'

import { FolderContext } from './folder.provider'
import type { SocketMessageHandler } from './folder.types'

export const useFolderContext = (messageHandler?: SocketMessageHandler) => {
  const context = React.useContext(FolderContext)
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
