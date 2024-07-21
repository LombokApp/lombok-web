import { useAuthContext } from '@stellariscloud/auth-utils'
import type { FolderPushMessage } from '@stellariscloud/types'
import React from 'react'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

type MessageCallback = (msg: {
  name: FolderPushMessage
  payload: { [key: string]: string }
}) => void

const SOCKET_BASE_URL = process.env.NEXT_PUBLIC_SOCKET_BASE_URL ?? ''

export const useWebsocket = (namespace: string, onMessage: MessageCallback) => {
  const [socketState, setSocketState] = React.useState<{
    socket?: Socket
    connected: boolean
    reconnectKey: string
  }>({
    socket: undefined,
    connected: false,
    reconnectKey: '___',
  })

  const authContext = useAuthContext()

  React.useEffect(() => {
    const lastHandler = onMessage
    const lastSocket = socketState.socket
    lastSocket?.onAny(onMessage)
    return () => {
      socketState.socket?.offAny(lastHandler)
    }
  }, [socketState.socket, onMessage])

  React.useEffect(() => {
    if (!socketState.socket?.active && authContext.viewer?.id) {
      void authContext.getAccessToken().then((token) => {
        const s = io(`${SOCKET_BASE_URL}/${namespace}`, {
          auth: {
            userId: authContext.viewer?.id,
            token,
          },
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
    }
  }, [
    socketState.socket?.active,
    socketState.reconnectKey,
    authContext.viewer?.id,
  ])

  return {
    ...socketState,
  }
}
