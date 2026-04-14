import type net from 'node:net'

export type SessionMode = 'ephemeral' | 'persistent'
export type SessionState = 'created' | 'active' | 'closing'
export type TunnelProtocol = 'framed' | 'raw'

export interface TunnelSession {
  id: string
  containerId: string
  hostId: string
  mode: SessionMode
  state: SessionState
  createdAt: number
  lastActivityAt: number
  clients: Set<unknown>
  execId: string | null
  execStream: net.Socket | null
  command: string[]
  protocol: TunnelProtocol
  tty: boolean // true for PTY (merged stdout/stderr), false for pipe (demuxed)
  agentReady: boolean
  publicId: string | null
  label: string
  appIdentifier: string | null
}

export type Session = TunnelSession
