import fs from 'fs'

import type {
  WorkerPipeMessage,
  WorkerPipeRequest,
  WorkerPipeResponse,
} from './types'

const LOMBOK_PIPE_DEBUG = false as boolean
/**
 * Utility class for reading structured messages from named pipes
 */
export class PipeReader {
  private readonly pipePath: string
  private buffer = ''
  private readonly messageQueue: WorkerPipeMessage[] = []
  private fileHandle: fs.promises.FileHandle | null = null

  constructor(pipePath: string) {
    this.pipePath = pipePath
  }

  private debug(...args: unknown[]): void {
    if (LOMBOK_PIPE_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[PipeReader]', ...args)
    }
  }

  /**
   * Ensure the pipe is open for reading
   */
  private async ensurePipeOpen(): Promise<number> {
    if (this.fileHandle === null) {
      this.fileHandle = await fs.promises.open(this.pipePath, 'r')
    }
    return this.fileHandle.fd
  }

  /**
   * Read the next complete message from the pipe
   * Messages are JSON objects separated by newlines
   */
  async readMessage(): Promise<WorkerPipeMessage> {
    // If we already have queued messages from a previous read, return one immediately
    if (this.messageQueue.length > 0) {
      const next = this.messageQueue.shift()
      if (next) {
        return next
      }
    }

    return new Promise((resolve, reject) => {
      const readBuf = Buffer.alloc(4096)
      const readData = async (): Promise<void> => {
        try {
          const fd = await this.ensurePipeOpen()
          fs.read(
            fd,
            readBuf,
            0,
            readBuf.length,
            null,
            (readErr, bytesRead) => {
              if (readErr) {
                reject(new Error(`Pipe read error: ${readErr.message}`))
                return
              }

              if (bytesRead === 0) {
                // End of stream: writer closed. Reopen and continue waiting for messages.
                // Close existing handle and reopen to block until a writer connects again.
                const reopen = async () => {
                  if (this.fileHandle !== null) {
                    try {
                      await this.fileHandle.close()
                    } catch (e) {
                      // eslint-disable-next-line no-console
                      console.warn(
                        'PipeReader: error closing handle after EOF',
                        e,
                      )
                    }
                    this.fileHandle = null
                  }
                  await this.ensurePipeOpen()
                  await readData()
                }
                void reopen()
                return
              }

              const chunk = readBuf.subarray(0, bytesRead).toString('utf8')
              this.debug(
                `Read ${bytesRead} bytes: ${chunk.substring(0, 100)}${chunk.length > 100 ? '...' : ''}`,
              )
              this.buffer += chunk

              // Look for complete messages (JSON objects separated by newlines)
              const lines = this.buffer.split('\n')

              // Keep the last incomplete line in buffer
              this.buffer = lines.pop() || ''

              // Parse complete lines and enqueue them
              for (const line of lines) {
                const trimmed = line.trim()
                if (!trimmed) {
                  continue
                }
                try {
                  const message = JSON.parse(trimmed) as WorkerPipeMessage
                  this.debug(
                    `Parsed message type=${message.type} payload=${JSON.stringify(message.payload).substring(0, 100)}${JSON.stringify(message.payload).length > 100 ? '...' : ''}`,
                  )
                  this.messageQueue.push(message)
                } catch (error) {
                  reject(
                    new Error(
                      `Failed to parse pipe message: ${error instanceof Error ? error.message : String(error)}`,
                    ),
                  )
                  return
                }
              }

              // If we have at least one parsed message, return the next one; keep the rest queued
              if (this.messageQueue.length > 0) {
                const next = this.messageQueue.shift()
                if (next) {
                  resolve(next)
                  return
                }
              }

              // No complete message yet, continue reading
              void readData()
            },
          )
        } catch (e) {
          reject(e as Error)
        }
      }

      void readData()
    })
  }

  /**
   * Read a request message from the pipe
   */
  async readRequest(): Promise<WorkerPipeRequest> {
    const message = await this.readMessage()
    if (message.type !== 'request' || !message.payload) {
      throw new Error(`Expected request message, got: ${message.type}`)
    }
    return message.payload as WorkerPipeRequest
  }

  /**
   * Check if a shutdown message was received
   */
  async checkForShutdown(): Promise<boolean> {
    try {
      const message = await this.readMessage()
      return message.type === 'shutdown'
    } catch {
      return false
    }
  }

  /**
   * Close the pipe reader
   */
  async close(): Promise<void> {
    if (this.fileHandle !== null) {
      await this.fileHandle.close()
      this.fileHandle = null
    }
  }
}

/**
 * Utility class for writing structured messages to named pipes
 */
export class PipeWriter {
  private readonly pipePath: string
  private fileHandle: fs.promises.FileHandle | null = null
  // Serialize writes to prevent interleaving and ensure ordering
  private writeQueue: Promise<void> = Promise.resolve()

  private static sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }

  constructor(pipePath: string) {
    this.pipePath = pipePath
  }

  private debug(...args: unknown[]): void {
    if (LOMBOK_PIPE_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[PipeWriter]', ...args)
    }
  }

  /**
   * Ensure the pipe is open for writing
   */
  private async ensurePipeOpen(): Promise<fs.promises.FileHandle> {
    if (this.fileHandle === null) {
      // Open for write only; for FIFOs this will block until a reader is present
      this.fileHandle = await fs.promises.open(this.pipePath, 'w')
    }
    return this.fileHandle
  }

  /**
   * Write a message to the pipe
   */
  private async writeMessage(message: WorkerPipeMessage): Promise<void> {
    const payloadBuffer = Buffer.from(JSON.stringify(message) + '\n', 'utf8')
    const fileHandle = await this.ensurePipeOpen()

    // Chain writes to guarantee serialization per writer instance
    const next = this.writeQueue.then(async () => {
      await this.writeBufferFully(fileHandle, payloadBuffer)
    })

    // Do not let a rejection break the chain for future writes
    this.writeQueue = next.catch((_err) => undefined)
    return next
  }

  /**
   * Reliably write the entire buffer to the file descriptor, handling partial writes and EAGAIN.
   */
  private async writeBufferFully(
    fileHandle: fs.promises.FileHandle,
    buffer: Buffer,
  ): Promise<void> {
    let offset = 0
    // Simple retry/backoff for transient errors
    const maxRetries = 5
    let attempt = 0

    while (offset < buffer.length) {
      try {
        const { bytesWritten } = await fileHandle.write(
          buffer,
          offset,
          buffer.length - offset,
          null,
        )
        attempt = 0
        offset += bytesWritten
      } catch (err) {
        const error = err as NodeJS.ErrnoException
        if (error.code === 'EAGAIN' || error.code === 'EWOULDBLOCK') {
          if (attempt >= maxRetries) {
            throw new Error('Pipe write would block after retries')
          }
          attempt += 1
          const delayMs = 2 ** attempt
          await PipeWriter.sleep(delayMs)
          continue
        }
        throw error
      }
    }
  }

  /**
   * Close the pipe writer
   */
  async close(): Promise<void> {
    // Ensure all queued writes complete before closing
    try {
      await this.writeQueue
    } catch {
      // swallow to allow close to proceed
    }
    if (this.fileHandle !== null) {
      await this.fileHandle.close()
      this.fileHandle = null
    }
  }

  /**
   * Write a streaming response - sends metadata first, then chunks
   */
  private async writeStreamingResponse(
    response: Response,
    requestId: string,
  ): Promise<void> {
    // First, send the response metadata
    const headers = new Headers(response.headers)
    // Override Content-Type for streaming responses to use application/json
    headers.set('Content-Type', 'application/json')

    const responseMetadata = {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(headers.entries()),
      url: response.url,
      isStreaming: true,
    }

    const metadataMessage: WorkerPipeMessage = {
      type: 'response',
      payload: {
        id: requestId,
        timestamp: Date.now(),
        success: true,
        response: responseMetadata,
      },
    }

    await this.writeMessage(metadataMessage)

    // Then stream the body in chunks
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

          // Convert chunk to base64 for safe transmission
          const chunkData = Buffer.from(value).toString('base64')

          const chunkMessage: WorkerPipeMessage = {
            type: 'stream_chunk',
            payload: {
              requestId,
              chunk: chunkData,
              chunkIndex,
            },
          }

          this.debug(`Sending chunk ${chunkIndex} for ${requestId}`)
          await this.writeMessage(chunkMessage)
          this.debug(`Sent chunk ${chunkIndex} for ${requestId}`)
          chunkIndex++
        }
      } finally {
        reader.releaseLock()
      }

      // Send end-of-stream marker
      this.debug(
        `Sending stream_end for ${requestId} with ${chunkIndex} total chunks`,
      )

      const endMessage: WorkerPipeMessage = {
        type: 'stream_end',
        payload: {
          requestId,
          totalChunks: chunkIndex,
        },
      }

      await this.writeMessage(endMessage)

      this.debug(`Sent stream_end for ${requestId}`)
    } else {
      // No body, just send end marker
      this.debug(`Sending stream_end for ${requestId} with 0 total chunks`)

      const endMessage: WorkerPipeMessage = {
        type: 'stream_end',
        payload: {
          requestId,
          totalChunks: 0,
        },
      }

      await this.writeMessage(endMessage)

      this.debug(`Sent stream_end for ${requestId} (no body)`)
    }
  }

  /**
   * Write a request to the pipe
   */
  async writeRequest(request: WorkerPipeRequest): Promise<void> {
    await this.writeMessage({
      type: 'request',
      payload: request,
    })
  }

  /**
   * Write a response to the pipe
   */
  async writeResponse(response: WorkerPipeResponse): Promise<void> {
    // Check if the response contains a Response object
    if (response.response instanceof Response) {
      const resp = response.response

      // Try to detect if this is a small, complete response by checking content-type
      const contentType = resp.headers.get('content-type') || ''
      const contentLength = resp.headers.get('content-length')
      const transferEncoding = resp.headers.get('transfer-encoding')

      // Treat as static if:
      // 1. It's a common API response type (JSON, HTML, plain text)
      // 2. AND it's not explicitly chunked transfer-encoding
      // 3. AND if it has content-length, it's under 1MB
      const isLikelyStatic =
        (contentType.includes('application/json') ||
          contentType.includes('text/html') ||
          contentType.includes('text/plain')) &&
        transferEncoding !== 'chunked' &&
        (contentLength === null || parseInt(contentLength, 10) < 1024 * 1024)

      if (isLikelyStatic) {
        this.debug('Detected likely static response - serializing normally')

        // Read the body and serialize as a complete response
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
        // Default to streaming for responses that might be streaming
        this.debug('Using streaming protocol for Response object')
        await this.writeStreamingResponse(resp, response.id)
      }
    } else {
      // Regular response, use normal message protocol
      await this.writeMessage({
        type: 'response',
        payload: response,
      })
    }
  }

  /**
   * Write a stdout text chunk associated with a given request
   */
  async writeStdoutChunk(requestId: string, text: string): Promise<void> {
    await this.writeMessage({
      type: 'stdout_chunk',
      payload: { requestId, text },
    })
  }

  /**
   * Write a shutdown message to the pipe
   */
  async writeShutdown(): Promise<void> {
    await this.writeMessage({
      type: 'shutdown',
      payload: null,
    })
  }
}

/**
 * Create both input and output pipes for worker communication
 */
export async function createWorkerPipes(
  requestPipePath: string,
  responsePipePath: string,
): Promise<void> {
  const { spawn } = await import('bun')

  // Remove pipes if they already exist
  for (const pipePath of [requestPipePath, responsePipePath]) {
    if (await fs.promises.exists(pipePath)) {
      await fs.promises.unlink(pipePath)
    }
  }

  // Create both named pipes
  for (const pipePath of [requestPipePath, responsePipePath]) {
    const mkfifoProc = spawn({
      cmd: ['mkfifo', pipePath],
      stdout: 'inherit',
      stderr: 'inherit',
    })

    const mkfifoCode = await mkfifoProc.exited
    if (mkfifoCode !== 0) {
      throw new Error(`Failed to create named pipe: ${pipePath}`)
    }

    // Set permissions for the pipe
    await fs.promises.chmod(pipePath, 0o666)
  }
}

/**
 * Clean up worker pipes
 */
export async function cleanupWorkerPipes(
  requestPipePath: string,
  responsePipePath: string,
): Promise<void> {
  for (const pipePath of [requestPipePath, responsePipePath]) {
    if (await fs.promises.exists(pipePath)) {
      try {
        await fs.promises.unlink(pipePath)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error(`Error removing pipe ${pipePath}:`, error)
      }
    }
  }
}
