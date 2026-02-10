import type {
  WorkerMessage,
  WorkerRequest,
  WorkerResponse,
} from '@lombokapp/worker-utils'
import { createConnection, type Socket } from 'net'

const LOMBOK_SOCKET_DEBUG = true as boolean

/**
 * Debug logging helper
 */
const debugLog = (prefix: string, ...args: unknown[]): void => {
  if (LOMBOK_SOCKET_DEBUG) {
    // eslint-disable-next-line no-console
    console.log(prefix, ...args)
  }
}

/**
 * Direct stdout write that bypasses any console.log overrides
 */
const directLog = (msg: string): void => {
  try {
    process.stdout.write(`[DIRECT] ${msg}\n`)
  } catch {
    // ignore errors
  }
}

/**
 * Socket-based message reader for worker daemon.
 * Connects to the host's socket server and receives request messages.
 */
export class SocketReader {
  private readonly socketPath: string
  private socket: Socket | null = null
  private buffer = ''
  private readonly messageQueue: WorkerMessage[] = []
  private messageResolvers: ((msg: WorkerMessage) => void)[] = []
  private connectionError: Error | null = null
  private closed = false

  constructor(socketPath: string) {
    this.socketPath = socketPath
  }

  /**
   * Connect to the socket server
   */
  async connect(): Promise<void> {
    if (this.socket) {
      return
    }

    debugLog('[SocketReader]', `Connecting to ${this.socketPath}`)

    return new Promise((resolve, reject) => {
      const socket = createConnection(this.socketPath, () => {
        debugLog('[SocketReader]', `Connected to ${this.socketPath}`)
        this.socket = socket
        resolve()
      })

      socket.on('data', (data: Buffer) => {
        this.handleData(data)
      })

      socket.on('error', (error: Error) => {
        debugLog('[SocketReader]', 'Socket error:', error.message)
        if (!this.socket) {
          reject(error)
        } else {
          this.connectionError = error
          this.rejectPendingReads(error)
        }
      })

      socket.on('close', () => {
        debugLog('[SocketReader]', 'Socket closed')
        this.closed = true
        this.rejectPendingReads(new Error('Socket closed'))
      })

      socket.setTimeout(30000)
      socket.on('timeout', () => {
        if (!this.socket) {
          socket.destroy()
          reject(new Error('Socket connection timeout'))
        }
      })
    })
  }

  private handleData(data: Buffer): void {
    this.buffer += data.toString()

    let idx = this.buffer.indexOf('\n')
    while (idx !== -1) {
      const line = this.buffer.slice(0, idx)
      this.buffer = this.buffer.slice(idx + 1)

      if (line.trim()) {
        try {
          const message = JSON.parse(line) as WorkerMessage
          debugLog('[SocketReader]', `Received message type=${message.type}`)
          this.deliverMessage(message)
        } catch (e) {
          // eslint-disable-next-line no-console
          console.error('[SocketReader] Failed to parse message:', e)
        }
      }

      idx = this.buffer.indexOf('\n')
    }
  }

  private deliverMessage(message: WorkerMessage): void {
    const resolver = this.messageResolvers.shift()
    if (resolver) {
      resolver(message)
    } else {
      this.messageQueue.push(message)
    }
  }

  private rejectPendingReads(_error: Error): void {
    this.messageResolvers = []
  }

  /**
   * Read the next message from the socket
   */
  async readMessage(): Promise<WorkerMessage> {
    if (this.connectionError) {
      throw this.connectionError
    }
    if (this.closed) {
      throw new Error('Socket is closed')
    }

    // Check queue first
    const queued = this.messageQueue.shift()
    if (queued) {
      return queued
    }

    // Wait for next message
    return new Promise((resolve, reject) => {
      if (this.connectionError || this.closed) {
        reject(this.connectionError || new Error('Socket is closed'))
        return
      }
      this.messageResolvers.push(resolve)
    })
  }

  /**
   * Read a request message
   */
  async readRequest(): Promise<WorkerRequest> {
    const message = await this.readMessage()
    if (message.type !== 'request' || !message.payload) {
      throw new Error(`Expected request message, got: ${message.type}`)
    }
    return message.payload as WorkerRequest
  }

  /**
   * Get the underlying socket for writing responses
   */
  getSocket(): Socket {
    if (!this.socket) {
      throw new Error('Socket not connected')
    }
    return this.socket
  }

  /**
   * Close the socket connection
   */
  // eslint-disable-next-line @typescript-eslint/require-await
  async close(): Promise<void> {
    if (this.socket) {
      this.socket.destroy()
      this.socket = null
    }
    this.closed = true
  }
}

/**
 * Socket-based message writer for worker daemon.
 * Writes response messages to the connected socket.
 */
export class SocketWriter {
  private socket: Socket | null = null
  private writeQueue: Promise<void> = Promise.resolve()

  /**
   * Set the socket to write to (shared with SocketReader)
   */
  setSocket(socket: Socket): void {
    this.socket = socket
    debugLog('[SocketWriter]', 'Socket attached')
  }

  /**
   * Write a message to the socket
   */
  private async writeMessage(message: WorkerMessage): Promise<void> {
    if (!this.socket) {
      throw new Error('Socket not connected')
    }

    const msgType = message.type
    directLog(`writeMessage called for type=${msgType}`)

    const data = JSON.stringify(message) + '\n'

    // Serialize writes to prevent interleaving
    const next = this.writeQueue.then(async () => {
      directLog(`writeMessage: starting write for type=${msgType}`)
      await this.writeToSocket(data)
      directLog(`writeMessage: completed write for type=${msgType}`)
    })

    this.writeQueue = next.catch(() => undefined)
    return next
  }

  private writeToSocket(data: string): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.socket) {
        reject(new Error('Socket not connected'))
        return
      }

      this.socket.write(data, (error?: Error | null) => {
        if (error) {
          reject(error)
        } else {
          resolve()
        }
      })
    })
  }

  /**
   * Write a streaming response - sends metadata first, then chunks
   */
  private async writeStreamingResponse(
    response: Response,
    requestId: string,
  ): Promise<void> {
    const headers = new Headers(response.headers)
    headers.set('Content-Type', 'application/json')

    const responseMetadata = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(headers.entries()),
      url: response.url,
      isStreaming: true,
    }

    const metadataMessage: WorkerMessage = {
      type: 'response',
      payload: {
        id: requestId,
        timestamp: Date.now(),
        success: true,
        response: responseMetadata,
      },
    }

    await this.writeMessage(metadataMessage)

    if (response.body) {
      const reader = response.body.getReader()
      let chunkIndex = 0

      try {
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            break
          }

          const chunkData = Buffer.from(value).toString('base64')
          const chunkMessage: WorkerMessage = {
            type: 'stream_chunk',
            payload: {
              requestId,
              chunk: chunkData,
              chunkIndex,
            },
          }

          await this.writeMessage(chunkMessage)
          chunkIndex++
        }
      } finally {
        reader.releaseLock()
      }

      const endMessage: WorkerMessage = {
        type: 'stream_end',
        payload: {
          requestId,
          totalChunks: chunkIndex,
        },
      }
      await this.writeMessage(endMessage)
    } else {
      const endMessage: WorkerMessage = {
        type: 'stream_end',
        payload: {
          requestId,
          totalChunks: 0,
        },
      }
      await this.writeMessage(endMessage)
    }
  }

  /**
   * Write a request to the socket (for host side)
   */
  async writeRequest(request: WorkerRequest): Promise<void> {
    await this.writeMessage({
      type: 'request',
      payload: request,
    })
  }

  /**
   * Write a response to the socket
   */
  async writeResponse(response: WorkerResponse): Promise<void> {
    if (response.response instanceof Response) {
      const resp = response.response

      const contentType = resp.headers.get('content-type') || ''
      const contentLength = resp.headers.get('content-length')
      const transferEncoding = resp.headers.get('transfer-encoding')

      const isLikelyStatic =
        (contentType.includes('application/json') ||
          contentType.includes('text/html') ||
          contentType.includes('text/plain')) &&
        transferEncoding !== 'chunked' &&
        (contentLength === null || parseInt(contentLength, 10) < 1024 * 1024)

      if (isLikelyStatic) {
        const body = await resp.text()
        const serializedResponse = {
          status: resp.status,
          statusText: resp.statusText,
          headers: Object.fromEntries(resp.headers.entries()),
          body,
          url: resp.url,
        }

        await this.writeMessage({
          type: 'response',
          payload: {
            ...response,
            response: serializedResponse,
          },
        })
      } else {
        await this.writeStreamingResponse(resp, response.id)
      }
    } else {
      directLog(`writeResponse: sending regular response for id=${response.id}`)
      await this.writeMessage({
        type: 'response',
        payload: response,
      })
      directLog(`writeResponse: completed for id=${response.id}`)
    }
  }

  /**
   * Write a stdout chunk
   */
  async writeStdoutChunk(requestId: string, text: string): Promise<void> {
    await this.writeMessage({
      type: 'stdout_chunk',
      payload: { requestId, text },
    })
  }

  /**
   * Write a shutdown message
   */
  async writeShutdown(): Promise<void> {
    await this.writeMessage({
      type: 'shutdown',
      payload: null,
    })
  }

  /**
   * Close the writer (socket is shared, don't destroy here)
   */
  async close(): Promise<void> {
    // Wait for pending writes
    try {
      await this.writeQueue
    } catch {
      // Ignore
    }
  }
}

/**
 * Connect to the host socket and return reader/writer pair.
 * This is the main entry point for the worker daemon.
 */
export async function connectToHostSocket(socketPath: string): Promise<{
  reader: SocketReader
  writer: SocketWriter
}> {
  const reader = new SocketReader(socketPath)
  await reader.connect()

  const writer = new SocketWriter()
  writer.setSocket(reader.getSocket())

  return { reader, writer }
}
