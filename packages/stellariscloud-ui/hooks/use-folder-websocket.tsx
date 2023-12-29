import { useAuthContext } from '@stellariscloud/auth-utils'
import type { FolderPushMessage } from '@stellariscloud/types'
import React from 'react'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

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
    if (folderId && !socketState.socket?.active && authContext.viewer?.id) {
      void authContext.getAccessToken().then((token) => {
        const s = io(process.env.NEXT_PUBLIC_SOCKET_BASE_URL ?? '', {
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
    folderId,
    socketState.socket?.active,
    socketState.reconnectKey,
    authContext.viewer?.id,
    authContext,
  ])

  return {
    ...socketState,
  }
}
