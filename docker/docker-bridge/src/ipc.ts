import { createConnection, type Socket } from 'net'

export interface IpcConnection {
  socket: Socket
  onMessage: (handler: (message: unknown) => void) => void
  send: (message: unknown) => Promise<void>
}

/**
 * Connect to the parent process IPC socket (Unix domain socket).
 * Uses the same newline-delimited JSON protocol as core-worker.
 */
export function connectToParent(socketPath: string): Promise<IpcConnection> {
  return new Promise((resolve, reject) => {
    let buffer = ''
    const handlers: ((message: unknown) => void)[] = []

    const socket = createConnection(socketPath, () => {
      // Clear the connection timeout — socket should stay open indefinitely
      socket.setTimeout(0)
      resolve({
        socket,
        onMessage: (handler) => {
          handlers.push(handler)
        },
        send: (message) =>
          new Promise<void>((_resolve, _reject) => {
            socket.write(`${JSON.stringify(message)}\n`, (err) => {
              if (err) {
                _reject(err)
              } else {
                _resolve()
              }
            })
          }),
      })
    })

    socket.on('data', (data: Buffer) => {
      buffer += data.toString()
      let idx = buffer.indexOf('\n')
      while (idx !== -1) {
        const line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 1)
        if (line.trim()) {
          try {
            const parsed: unknown = JSON.parse(line)
            for (const h of handlers) {
              h(parsed)
            }
          } catch {
            // Invalid JSON, skip
          }
        }
        idx = buffer.indexOf('\n')
      }
    })

    socket.on('error', (err) => {
      reject(err)
    })

    socket.setTimeout(10000)
    socket.on('timeout', () => {
      socket.destroy()
      reject(new Error('IPC socket connection timeout'))
    })
  })
}
