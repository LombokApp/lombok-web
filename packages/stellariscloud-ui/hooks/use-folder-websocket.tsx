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
    reconnectKey: string
  }>({
    socket: undefined,
    connected: false,
    reconnectKey: '___',
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
    if (folderId && !socketState.socket?.active) {
      void foldersApi
        .createSocketAuthentication({ folderId })
        .then((response) => {
          const s = io(process.env.NEXT_PUBLIC_SOCKET_BASE_URL ?? '', {
            query: { token: response.data.token },
            reconnection: false,
          })
          setSocketState({
            socket: s,
            connected: false,
            reconnectKey: socketState.reconnectKey,
          })

          s.on('connect', () => {
            setSocketState({
              socket: s,
              connected: true,
              reconnectKey: socketState.reconnectKey,
            })
          })

          s.on('disconnect', () => {
            setSocketState({
              connected: false,
              reconnectKey: socketState.reconnectKey,
            })
          })

          s.on('error', () => {
            s.close()
            setSocketState({
              connected: false,
              reconnectKey: socketState.reconnectKey,
            })
          })
          s.on('close', () => {
            setSocketState({
              connected: false,
              reconnectKey: socketState.reconnectKey,
            })
          })
        })
        .catch(() => {
          setTimeout(
            () =>
              setSocketState((s) => ({
                ...s,
                reconnectKey: `___${Math.random()}`,
              })),
            2000,
          )
        })
    }
  }, [folderId, socketState.socket?.active, socketState.reconnectKey])

  return {
    ...socketState,
  }
}
