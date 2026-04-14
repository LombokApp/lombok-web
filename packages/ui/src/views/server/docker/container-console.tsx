import '@xterm/xterm/css/xterm.css'

import { useAuthContext } from '@lombokapp/auth-utils'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { cn } from '@lombokapp/ui-toolkit/utils'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { RefreshCcw, TerminalSquare } from 'lucide-react'
import React from 'react'
import type { Socket } from 'socket.io-client'
import { io } from 'socket.io-client'

interface ContainerConsoleProps {
  hostId: string
  containerId: string
  disabled?: boolean
}

type ConsoleState = 'idle' | 'connecting' | 'connected' | 'error' | 'exited'

export function ContainerConsole({
  hostId,
  containerId,
  disabled,
}: ContainerConsoleProps) {
  const termRef = React.useRef<HTMLDivElement>(null)
  const terminalRef = React.useRef<Terminal | null>(null)
  const fitAddonRef = React.useRef<FitAddon | null>(null)
  const socketRef = React.useRef<Socket | null>(null)
  const [state, setState] = React.useState<ConsoleState>('idle')
  const [errorMessage, setErrorMessage] = React.useState<string>()
  const authContext = useAuthContext()

  const connect = React.useCallback(async () => {
    // Cleanup previous session
    socketRef.current?.disconnect()
    terminalRef.current?.dispose()

    setState('connecting')
    setErrorMessage(undefined)

    const token = await authContext.getAccessToken()
    if (!token) {
      setState('error')
      setErrorMessage('Failed to get access token')
      return
    }

    // Create terminal
    const terminal = new Terminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, monospace',
      theme: {
        background: '#0c0c0c',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        selectionBackground: '#264f78',
      },
      allowProposedApi: true,
    })

    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)

    if (termRef.current) {
      terminal.open(termRef.current)
      fitAddon.fit()
    }

    terminalRef.current = terminal
    fitAddonRef.current = fitAddon

    // Connect socket
    const configuredBaseURL = import.meta.env.VITE_BACKEND_HOST ?? ''
    const baseURL = configuredBaseURL.length
      ? configuredBaseURL
      : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`

    const socket = io(`${baseURL}/container-exec/${hostId}:${containerId}`, {
      transports: ['websocket'],
      auth: {
        token,
        command: ['/bin/sh'],
        cols: terminal.cols,
        rows: terminal.rows,
      },
      reconnection: false,
    })

    socketRef.current = socket

    socket.on('exec:ready', () => {
      setState('connected')
    })

    socket.on('exec:data', (data: { dataBase64: string }) => {
      const bytes = Uint8Array.from(atob(data.dataBase64), (c) =>
        c.charCodeAt(0),
      )
      terminal.write(bytes)
    })

    socket.on('exec:error', (data: { message?: string }) => {
      setState('error')
      setErrorMessage(data.message ?? 'Connection error')
    })

    socket.on('exec:exit', () => {
      setState('exited')
      terminal.write('\r\n\x1b[90m[Session ended]\x1b[0m\r\n')
    })

    socket.on('disconnect', () => {
      setState((prev) => {
        if (prev !== 'exited' && prev !== 'error') {
          terminal.write('\r\n\x1b[90m[Disconnected]\x1b[0m\r\n')
          return 'exited'
        }
        return prev
      })
    })

    socket.on('connect_error', (err: Error) => {
      setState('error')
      setErrorMessage(err.message)
    })

    // Send input to backend
    terminal.onData((data) => {
      socket.emit('exec:input', { input: data })
    })

    // Handle resize
    terminal.onResize(({ cols, rows }) => {
      socket.emit('exec:resize', { cols, rows })
    })
  }, [hostId, containerId, authContext])

  // Fit terminal on window resize
  React.useEffect(() => {
    const handleResize = () => {
      fitAddonRef.current?.fit()
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Cleanup on unmount
  React.useEffect(() => {
    return () => {
      socketRef.current?.disconnect()
      terminalRef.current?.dispose()
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {state === 'idle' && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => void connect()}
            disabled={disabled}
          >
            <TerminalSquare className="mr-2 size-4" />
            Open Console
          </Button>
        )}
        {(state === 'exited' || state === 'error') && (
          <Button variant="outline" size="sm" onClick={() => void connect()}>
            <RefreshCcw className="mr-2 size-4" />
            Reconnect
          </Button>
        )}
        {state === 'connecting' && (
          <span className="text-sm text-muted-foreground">Connecting...</span>
        )}
        {state === 'connected' && (
          <span className="text-xs text-muted-foreground">
            Connected to {containerId.slice(0, 12)}
          </span>
        )}
        {errorMessage && (
          <span className="text-xs text-destructive">{errorMessage}</span>
        )}
      </div>
      <div
        ref={termRef}
        className={cn(
          'min-h-[300px] rounded-md border border-muted/30 bg-[#0c0c0c] p-1',
          state === 'idle' && 'hidden',
        )}
      />
    </div>
  )
}
