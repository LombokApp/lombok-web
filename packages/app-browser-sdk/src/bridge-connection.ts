/**
 * Direct WebSocket connection to the Docker bridge.
 * Bypasses the backend relay for terminal I/O, connecting the browser
 * directly to the bridge's WebSocket server using a session-scoped JWT.
 */

export interface BridgeSessionCredentials {
  sessionId: string
  token: string
  urls: {
    ws: string
    http: string
  }
}

export interface BridgeConnectionOptions {
  credentials: BridgeSessionCredentials
  onData: (data: Uint8Array) => void
  onClose: () => void
  onError?: (error: string) => void
}

export interface BridgeConnection {
  /** Send input data to the PTY */
  sendInput: (data: string) => void
  /** Resize the PTY */
  resize: (cols: number, rows: number) => Promise<void>
  /** Close the connection and destroy the session */
  destroy: () => void
  /** Whether the WebSocket is currently connected */
  readonly connected: boolean
}

/**
 * Create a direct WebSocket connection to the Docker bridge.
 *
 * @returns A promise that resolves with the connection once the WebSocket is open,
 *          or rejects if the connection fails.
 */
export function createBridgeConnection(
  options: BridgeConnectionOptions,
): Promise<BridgeConnection> {
  const { credentials, onData, onClose, onError } = options
  const { sessionId, token, urls } = credentials

  return new Promise<BridgeConnection>((resolve, reject) => {
    const ws = new WebSocket(
      `${urls.ws}/sessions/${sessionId}/attach?token=${encodeURIComponent(token)}`,
    )
    ws.binaryType = 'arraybuffer'

    let destroyed = false
    let isConnected = false

    const timeout = setTimeout(() => {
      reject(new Error('Bridge WebSocket connect timeout (10s)'))
      ws.close()
    }, 10000)

    ws.addEventListener(
      'open',
      () => {
        clearTimeout(timeout)
        isConnected = true

        const connection: BridgeConnection = {
          get connected() {
            return isConnected
          },

          sendInput(data: string) {
            if (destroyed || ws.readyState !== WebSocket.OPEN) {
              return
            }
            ws.send(data)
          },

          async resize(cols: number, rows: number) {
            const response = await fetch(
              `${urls.http}/sessions/${sessionId}/resize`,
              {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ cols, rows }),
              },
            )
            if (!response.ok) {
              throw new Error(`Bridge resize failed (${response.status})`)
            }
          },

          destroy() {
            if (destroyed) {
              return
            }
            destroyed = true
            isConnected = false
            if (ws.readyState === WebSocket.OPEN) {
              ws.close()
            }
            // Best-effort session teardown
            void fetch(`${urls.http}/sessions/${sessionId}`, {
              method: 'DELETE',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }).catch(() => {
              // Best-effort cleanup
            })
          },
        }

        resolve(connection)
      },
      { once: true },
    )

    ws.addEventListener('message', (ev) => {
      if (destroyed) {
        return
      }
      const data =
        ev.data instanceof ArrayBuffer
          ? new Uint8Array(ev.data)
          : new TextEncoder().encode(ev.data as string)
      onData(data)
    })

    ws.addEventListener('close', () => {
      isConnected = false
      if (!destroyed) {
        onClose()
      }
    })

    ws.addEventListener(
      'error',
      (ev) => {
        clearTimeout(timeout)
        if (!isConnected) {
          reject(
            new Error(`Bridge WebSocket connect error: ${JSON.stringify(ev)}`),
          )
        } else {
          onError?.(`Bridge WebSocket error: ${JSON.stringify(ev)}`)
        }
      },
      { once: true },
    )
  })
}
