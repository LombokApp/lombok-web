import { useAuthContext } from '@stellariscloud/auth-utils'
import type { FolderPushMessage } from '@stellariscloud/types'
import React from 'react'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

type MessageCallback = (msg: {
  name: FolderPushMessage
  payload: Record<string, string>
}) => void

export const useWebsocket = (
  namespace: string,
  onMessage: MessageCallback,
  authParams: Record<string, string> = {},
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
  const [socketBaseURL, setSocketBaseURL] = React.useState<string>()

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      setSocketBaseURL(
        `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`,
      )
    }
  }, [])

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
    if (
      socketBaseURL &&
      !socketState.socket?.active &&
      authContext.viewer?.id
    ) {
      void authContext.getAccessToken().then((token) => {
        const s = io(`${socketBaseURL}/${namespace}`, {
          auth: {
            // userId: authContext.viewer?.id,
            ...authParams,
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
    authContext,
    namespace,
    authParams,
    socketBaseURL,
  ])

  return {
    ...socketState,
  }
}
