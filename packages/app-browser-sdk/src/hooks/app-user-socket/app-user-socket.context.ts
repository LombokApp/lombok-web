import React from 'react'
import type { Socket } from 'socket.io-client'

export interface AppUserSocketContextValue {
  socket: Socket | null
  connected: boolean
  reconnectCount: number
  subscribe: (
    eventName: string,
    handler: (payload: unknown) => void,
  ) => () => void
}

export const AppUserSocketContext =
  React.createContext<AppUserSocketContextValue | null>(null)
