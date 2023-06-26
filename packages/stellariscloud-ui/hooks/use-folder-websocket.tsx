import type { FolderPushMessage } from '@stellariscloud/types'
import React from 'react'

import { api } from '../services/stellariscloud-api/api'

type MessageCallback = (msg: {
  name: FolderPushMessage
  payload: { [key: string]: string | any }
}) => void

interface Callback {
  innerCallback: MessageCallback
  outerCallback: (ev: WebSocketEventMap['message']) => void
}

export const useFolderWebsocket = (
  folderId: string,
  onMessage: MessageCallback,
) => {
  const callbackRef = React.useRef<Callback>()
  const websocket = React.useRef<WebSocket>()
  React.useEffect(() => {
    if (websocket.current) {
      let justDeregistered = false
      if (
        callbackRef.current &&
        callbackRef.current.innerCallback !== onMessage
      ) {
        websocket.current.removeEventListener(
          'message',
          callbackRef.current.outerCallback,
        )
        callbackRef.current = undefined
        justDeregistered = true
      }
      if (!callbackRef.current || justDeregistered) {
        const outerCallback = (ev: WebSocketEventMap['message']) => {
          const data = JSON.parse(ev.data as string) as {
            name: FolderPushMessage
            payload: { [key: string]: string | any }
          }
          onMessage(data)
        }
        callbackRef.current = {
          innerCallback: onMessage,
          outerCallback,
        }
        websocket.current.addEventListener('message', outerCallback)
      }
    }
  }, [onMessage])

  React.useEffect(() => {
    if (!websocket.current && folderId) {
      // console.log('websocket startup')
      void api.folderWebSocket({ folderId }).then((ws) => {
        websocket.current = ws
        ws.addEventListener('error', (errorEvent) => {
          console.error('websocket error:', errorEvent)
        })
        ws.addEventListener('close', (_closeEvent) => {
          // console.log('websocket close:', closeEvent)
          websocket.current = undefined
        })
      })
    }
  }, [folderId])

  React.useEffect(() => {
    if (websocket.current?.readyState === 3) {
      websocket.current = undefined
    }
  }, [websocket.current?.readyState])

  React.useEffect(() => {
    return () => {
      if (websocket.current) {
        websocket.current.close()
      }
    }
  }, [])

  return {
    webSocket: websocket.current,
    close: () => websocket.current?.close(),
    connecting: websocket.current?.readyState === 0,
    connected: websocket.current?.readyState === 1,
    closing: websocket.current?.readyState === 2,
    closed: websocket.current?.readyState === 3,
  }
}
