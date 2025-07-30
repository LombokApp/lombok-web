import { useAuthContext } from '@stellariscloud/auth-utils'
import type { FolderPushMessage } from '@stellariscloud/types'
import React from 'react'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

type MessageCallback = (
  name: FolderPushMessage,
  payload: Record<string, string>,
) => void

export const useWebsocket = (
  namespace: string,
  onMessage: MessageCallback,
  authParams: Record<string, string> = {},
) => {
  const [socketState, setSocketState] = React.useState<{
    socket?: Socket
    reconnectKey: string
  }>({
    socket: undefined,
    reconnectKey: '___',
  })
  const [socketBaseURL, setSocketBaseURL] = React.useState<string>()

  React.useEffect(() => {
    const configuredBaseURL = import.meta.env.VITE_BACKEND_HOST as string
    const baseURL = configuredBaseURL.length
      ? configuredBaseURL
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`
    setSocketBaseURL(baseURL)
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
    if (socketBaseURL && !socketState.socket) {
      void authContext.getAccessToken().then((token) => {
        const socketUrl = `${socketBaseURL}/${namespace}`
        const s = io(socketUrl, {
          transports: ['websocket'],
          auth: {
            userId: authContext.viewer?.id,
            ...authParams,
            token,
          },
          reconnection: false,
        })

        setSocketState({
          socket: s,
          reconnectKey: socketState.reconnectKey,
        })

        s.on('connect', () => {
          // console.log(`socket connected ns(${namespace}):`, {
          //   ...s,
          // })
          setSocketState({
            socket: s,
            reconnectKey: socketState.reconnectKey,
          })
        })

        s.on('disconnect', () => {
          // console.log(`socket disconnected ns(${namespace}):`, {
          //   ...s,
          // })

          setSocketState({
            reconnectKey: socketState.reconnectKey,
          })
        })

        s.on('error', () => {
          console.log('socket error:', socketState.socket)
          s.close()
          setSocketState({
            reconnectKey: socketState.reconnectKey,
          })
        })
      })
    }
  }, [
    socketState.reconnectKey,
    socketState,
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
