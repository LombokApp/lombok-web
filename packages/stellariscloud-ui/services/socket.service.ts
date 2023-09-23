import { io } from 'socket.io-client'

import { foldersApi } from './api'

export const configureSocketConnection = (folderId: string) => {
  return foldersApi
    .createSocketAuthentication({ folderId })
    .then((response) => {
      const socket = io(process.env.NEXT_PUBLIC_SOCKET_BASE_URL ?? '', {
        query: { token: response.data.token },
      })
      // ws.addEventListener('error', (errorEvent) => {
      //   console.error('websocket error:', errorEvent)
      // })
      // ws.addEventListener('close', (_closeEvent) => {
      //   // console.log('websocket close:', closeEvent)
      //   websocket.current = undefined
      // })
      return socket
    })

  // // client-side
  // socket.on('connect', () => {
  //   console.log(socket.id) // x8WIv7-mJelg7on_ALbx
  // })

  // socket.on('disconnect', () => {
  //   console.log(socket.id) // undefined
  // })
}
