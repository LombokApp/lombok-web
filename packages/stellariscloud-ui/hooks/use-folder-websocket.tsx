import type { FolderPushMessage } from '@stellariscloud/types'
import React from 'react'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

import { foldersApi } from '../services/api'

type MessageCallback = (msg: {
  name: FolderPushMessage
  payload: { [key: string]: string }
}) => void

export const useFolderWebsocket = (
  folderId: string,
  onMessage: MessageCallback,
) => {
  const [socketState, setSocketState] = React.useState<{
    socket?: Socket
    connected: boolean
  }>({
    socket: undefined,
    connected: false,
  })

  React.useEffect(() => {
    const lastHandler = onMessage
    const lastSocket = socketState.socket
    lastSocket?.onAny(onMessage)
    return () => {
      socketState.socket?.offAny(lastHandler)
    }
  }, [socketState.socket, onMessage])

  React.useEffect(() => {
    if (folderId) {
      foldersApi.createSocketAuthentication({ folderId }).then((response) => {
        const s = io(process.env.NEXT_PUBLIC_SOCKET_BASE_URL ?? '', {
          query: { token: response.data.token },
        })
        setSocketState({ socket: s, connected: false })

        s.on('connect', () => {
          setSocketState({ socket: s, connected: true })
        })

        s.on('disconnect', () => {
          setSocketState({ connected: false })
        })

        s.on('error', () => {
          s.close()
          setSocketState({ connected: false })
        })
        s.on('close', () => {
          setSocketState({ connected: false })
        })
      })
    }
  }, [folderId])

  return {
    ...socketState,
  }
}
