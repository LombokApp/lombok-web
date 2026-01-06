import fs from 'fs'
import type { Server, Socket } from 'net'
import { createConnection, createServer } from 'net'

export interface SocketMessageHandler {
  onMessage: (message: string) => void
  onError: (error: Error) => void
  onClose: () => void
}

/**
 * Creates a Unix domain socket server for IPC communication
 * Returns the server and a function to handle incoming connections
 */
export function createSocketServer(
  socketPath: string,
  onMessage: (message: string, socket: Socket) => void,
): Promise<{ server: Server; cleanup: () => void }> {
  return new Promise((resolve, reject) => {
    // Remove socket file if it already exists
    if (fs.existsSync(socketPath)) {
      fs.unlinkSync(socketPath)
    }

    const server = createServer((socket: Socket) => {
      let buffer = ''

      socket.on('data', (data: Buffer) => {
        buffer += data.toString()
        let idx = buffer.indexOf('\n')
        while (idx !== -1) {
          const line = buffer.slice(0, idx)
          buffer = buffer.slice(idx + 1)
          if (line.trim()) {
            onMessage(line, socket)
          }
          idx = buffer.indexOf('\n')
        }
      })

      socket.on('error', (_error: Error) => {
        try {
          socket.destroy()
        } catch {
          void 0
        }
      })

      socket.on('close', () => {
        // Connection closed
      })
    })

    server.on('error', (error: Error) => {
      reject(error)
    })

    const cleanup = () => {
      try {
        server.close()
        if (fs.existsSync(socketPath)) {
          fs.unlinkSync(socketPath)
        }
      } catch {
        void 0
      }
    }

    server.listen(socketPath, () => {
      // Set permissions so child process can connect
      try {
        fs.chmodSync(socketPath, 0o666)
      } catch {
        // Ignore chmod errors
      }
      resolve({ server, cleanup })
    })
  })
}

/**
 * Creates a Unix domain socket client for IPC communication
 */
export function createSocketClient(
  socketPath: string,
  handlers: SocketMessageHandler,
): Promise<Socket> {
  return new Promise((resolve, reject) => {
    let buffer = ''
    let connected = false

    const socket = createConnection(socketPath, () => {
      connected = true
      resolve(socket)
    })

    socket.on('data', (data: Buffer) => {
      buffer += data.toString()
      let idx = buffer.indexOf('\n')
      while (idx !== -1) {
        const line = buffer.slice(0, idx)
        buffer = buffer.slice(idx + 1)
        if (line.trim()) {
          handlers.onMessage(line)
        }
        idx = buffer.indexOf('\n')
      }
    })

    socket.on('error', (error: Error) => {
      if (!connected) {
        reject(error)
      } else {
        handlers.onError(error)
      }
    })

    socket.on('close', () => {
      handlers.onClose()
    })

    // Handle connection timeout
    socket.setTimeout(10000)
    socket.on('timeout', () => {
      if (!connected) {
        socket.destroy()
        reject(new Error('Socket connection timeout'))
      }
    })
  })
}

/**
 * Writes a JSON message to a socket with newline delimiter
 */
export function writeSocketMessage(
  socket: Socket,
  message: unknown,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const data = `${JSON.stringify(message)}\n`
    socket.write(data, (error?: Error | null) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}
