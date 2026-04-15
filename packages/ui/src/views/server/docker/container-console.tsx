import '@xterm/xterm/css/xterm.css'

import { useAuthContext } from '@lombokapp/auth-utils'
import { Button } from '@lombokapp/ui-toolkit/components/button/button'
import { cn } from '@lombokapp/ui-toolkit/utils'
import type { BridgeConnection } from '@lombokapp/utils'
import { createBridgeConnection } from '@lombokapp/utils'
import { FitAddon } from '@xterm/addon-fit'
import { Terminal } from '@xterm/xterm'
import { RefreshCcw, SquareX, TerminalSquare } from 'lucide-react'
import React from 'react'

import { $apiClient } from '@/src/services/api'

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
  const connectionRef = React.useRef<BridgeConnection | null>(null)
  const [state, setState] = React.useState<ConsoleState>('idle')
  const [errorMessage, setErrorMessage] = React.useState<string>()
  const authContext = useAuthContext()

  const connect = React.useCallback(async () => {
    // Cleanup previous session
    connectionRef.current?.destroy()
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

    // Create bridge session via REST
    const { data: credentials, error } = await $apiClient.POST(
      '/api/v1/docker/admin-bridge-sessions/tunnel',
      {
        body: {
          hostId,
          containerId,
          label: 'admin-console',
        },
      },
    )

    if (error) {
      setState('error')
      setErrorMessage('Failed to create bridge session')
      return
    }

    // Connect directly to bridge via WebSocket
    try {
      const connection = await createBridgeConnection({
        credentials,
        onData: (data: Uint8Array) => terminal.write(data),
        onClose: () => {
          setState((prev) => {
            if (prev !== 'error') {
              terminal.write('\r\n\x1b[90m[Session ended]\x1b[0m\r\n')
              return 'exited'
            }
            return prev
          })
        },
        onError: (msg) => {
          setState('error')
          setErrorMessage(msg)
        },
      })

      connectionRef.current = connection
      setState('connected')

      // Send initial resize
      void connection.resize(terminal.cols, terminal.rows)

      // Wire terminal input
      terminal.onData((data) => {
        connection.sendInput(data)
      })

      // Wire terminal resize
      terminal.onResize(({ cols, rows }) => {
        void connection.resize(cols, rows)
      })
    } catch (err) {
      setState('error')
      setErrorMessage(
        err instanceof Error ? err.message : 'Failed to connect to bridge',
      )
    }
  }, [hostId, containerId, authContext])

  const disconnect = React.useCallback(() => {
    connectionRef.current?.destroy()
    connectionRef.current = null
    terminalRef.current?.write('\r\n\x1b[90m[Session ended]\x1b[0m\r\n')
    setState('exited')
  }, [])

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
      connectionRef.current?.destroy()
      terminalRef.current?.dispose()
    }
  }, [])

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        {state === 'idle' && (
          <Button
            variant="outline"
            size="xs"
            onClick={() => void connect()}
            disabled={disabled}
          >
            <TerminalSquare className="mr-2 size-4" />
            Open Console
          </Button>
        )}
        {(state === 'exited' || state === 'error') && (
          <Button variant="outline" size="xs" onClick={() => void connect()}>
            <RefreshCcw className="mr-2 size-4" />
            Reconnect
          </Button>
        )}
        {state === 'connecting' && (
          <span className="text-sm text-muted-foreground">Connecting...</span>
        )}
        {state === 'connected' && (
          <>
            <span className="text-xs text-muted-foreground">
              Connected to {containerId.slice(0, 12)}
            </span>
            <Button variant="outline" size="xs" onClick={disconnect}>
              <SquareX className="mr-2 size-4" />
              End Session
            </Button>
          </>
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
