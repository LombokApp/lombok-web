import type {
  AppTask,
  IAppPlatformService,
  SerializeableRequest,
} from '@lombokapp/app-worker-sdk'
import type {
  WorkerModuleStartContext,
  WorkerPipeMessage,
} from '@lombokapp/core-worker'
import { downloadFileToDisk } from '@lombokapp/core-worker-utils'
import fs from 'fs'
import os from 'os'
import path from 'path'

import { ScriptExecutionError, WorkerScriptRuntimeError } from '../errors'
import {
  cleanupWorkerPipes,
  createWorkerPipes,
  PipeReader,
  PipeWriter,
} from './worker-daemon/pipe-utils'
import type {
  WorkerPipeRequest,
  WorkerPipeResponse,
} from './worker-daemon/types'

const LOMBOK_PIPE_DEBUG = false as boolean

/**
 * Message router that handles all pipe messages and routes them to appropriate handlers
 */
class MessageRouter {
  private readonly responseWaiters = new Map<
    string,
    (response: WorkerPipeResponse) => void
  >()
  private readonly streamingHandlers = new Map<
    string,
    {
      chunks: Map<number, Uint8Array>
      nextChunkIndex: number
      totalChunks?: number
      controller: ReadableStreamDefaultController<Uint8Array>
    }
  >()
  private readonly stdoutHandlers = new Map<string, (text: string) => void>()
  private readonly orphanedStdout = new Map<string, string[]>()
  // Buffer for chunks that arrive before their handler is registered
  private readonly orphanedChunks = new Map<
    string,
    { chunk: string; chunkIndex: number }[]
  >()
  private readonly orphanedStreamEnds = new Map<
    string,
    { totalChunks: number }
  >()
  private readonly reader: PipeReader
  private isRunning = false

  constructor(reader: PipeReader) {
    this.reader = reader
  }

  private debug(...args: unknown[]): void {
    if (LOMBOK_PIPE_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[MessageRouter]', ...args)
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return
    }
    this.isRunning = true

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (this.isRunning) {
      try {
        const message = await this.reader.readMessage()
        this.routeMessage(message)
      } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Message router error:', error)
        break
      }
    }
  }

  private routeMessage(message: WorkerPipeMessage): void {
    const key =
      (message.payload && 'id' in (message.payload as object)
        ? (message.payload as WorkerPipeResponse).id
        : undefined) ||
      (message.payload && 'requestId' in (message.payload as object)
        ? (message.payload as { requestId: string }).requestId
        : undefined)
    this.debug('received', message.type, key)

    switch (message.type) {
      case 'response': {
        const response = message.payload as WorkerPipeResponse
        const waiter = this.responseWaiters.get(response.id)
        if (waiter) {
          this.responseWaiters.delete(response.id)
          waiter(response)
        } else {
          this.debug(`No waiter found for response ${response.id}`)
        }
        break
      }
      case 'request': {
        // Not expected on response pipe; ignore
        break
      }
      case 'stream_chunk': {
        const payload = message.payload as {
          requestId: string
          chunk: string
          chunkIndex: number
        }
        this.handleStreamChunk(payload)
        break
      }
      case 'stream_end': {
        const payload = message.payload as {
          requestId: string
          totalChunks: number
        }
        this.handleStreamEnd(payload)
        break
      }
      case 'stdout_chunk': {
        const payload = message.payload as { requestId: string; text: string }
        const handler = this.stdoutHandlers.get(payload.requestId)
        if (handler) {
          handler(payload.text)
        } else {
          if (!this.orphanedStdout.has(payload.requestId)) {
            this.orphanedStdout.set(payload.requestId, [])
          }
          this.orphanedStdout.get(payload.requestId)?.push(payload.text)
        }
        break
      }
      case 'shutdown': {
        // Graceful shutdown signal; stop the router loop
        this.stop()
        break
      }
      default:
        break
    }
  }

  private handleStreamChunk(payload: {
    requestId: string
    chunk: string
    chunkIndex: number
  }): void {
    this.debug(`handleStreamChunk ${payload.requestId} #${payload.chunkIndex}`)

    const handler = this.streamingHandlers.get(payload.requestId)
    if (!handler) {
      this.debug(
        `No streaming handler for ${payload.requestId}; buffering #${payload.chunkIndex}`,
      )

      // Buffer this chunk for when the handler gets registered
      if (!this.orphanedChunks.has(payload.requestId)) {
        this.orphanedChunks.set(payload.requestId, [])
      }
      this.orphanedChunks.get(payload.requestId)?.push({
        chunk: payload.chunk,
        chunkIndex: payload.chunkIndex,
      })

      this.debug(
        `Buffered #${payload.chunkIndex} for ${payload.requestId}. Total buffered: ${this.orphanedChunks.get(payload.requestId)?.length}`,
      )
      return
    }

    this.debug(
      `Processing #${payload.chunkIndex} for ${payload.requestId} with handler`,
    )
    this.processChunk(
      handler,
      payload.chunk,
      payload.chunkIndex,
      payload.requestId,
    )
  }

  private processChunk(
    handler: {
      chunks: Map<number, Uint8Array>
      nextChunkIndex: number
      totalChunks?: number
      controller: ReadableStreamDefaultController<Uint8Array>
    },
    chunkData: string,
    chunkIndex: number,
    requestId: string,
  ): void {
    // Decode chunk
    const decodedChunkData = Buffer.from(chunkData, 'base64')
    const chunk = new Uint8Array(decodedChunkData)
    handler.chunks.set(chunkIndex, chunk)

    this.debug(
      `chunk ${chunkIndex} for ${requestId} (nextExpected: ${handler.nextChunkIndex}, stored: [${Array.from(
        handler.chunks.keys(),
      )
        .sort((a, b) => a - b)
        .join(',')}])`,
    )

    // Deliver chunks in order
    let deliveredCount = 0
    while (handler.chunks.has(handler.nextChunkIndex)) {
      const nextChunk = handler.chunks.get(handler.nextChunkIndex)
      if (nextChunk) {
        this.debug(
          `Delivering #${handler.nextChunkIndex} to stream for ${requestId}`,
        )
        handler.controller.enqueue(nextChunk)
        handler.chunks.delete(handler.nextChunkIndex)
        handler.nextChunkIndex++
        deliveredCount++
      } else {
        break
      }
    }

    if (deliveredCount > 0) {
      this.debug(
        `Delivered ${deliveredCount} to stream for ${requestId}. Next: ${handler.nextChunkIndex}`,
      )
    }
  }

  private handleStreamEnd(payload: {
    requestId: string
    totalChunks: number
  }): void {
    const handler = this.streamingHandlers.get(payload.requestId)
    if (!handler) {
      this.debug(
        `No streaming handler for stream end ${payload.requestId}; buffering`,
      )

      // Buffer the stream end for when the handler gets registered
      this.orphanedStreamEnds.set(payload.requestId, {
        totalChunks: payload.totalChunks,
      })
      return
    }

    this.processStreamEnd(handler, payload.requestId, payload.totalChunks)
  }

  private processStreamEnd(
    handler: {
      chunks: Map<number, Uint8Array>
      nextChunkIndex: number
      totalChunks?: number
      controller: ReadableStreamDefaultController<Uint8Array>
    },
    requestId: string,
    totalChunks: number,
  ): void {
    handler.totalChunks = totalChunks
    this.debug(
      `stream end for ${requestId}, total: ${totalChunks}, delivered: ${handler.nextChunkIndex}`,
    )

    // Deliver any remaining chunks
    while (
      handler.chunks.has(handler.nextChunkIndex) &&
      handler.nextChunkIndex < totalChunks
    ) {
      const nextChunk = handler.chunks.get(handler.nextChunkIndex)
      if (nextChunk) {
        this.debug(
          `Delivering final #${handler.nextChunkIndex} for ${requestId}`,
        )
        handler.controller.enqueue(nextChunk)
        handler.chunks.delete(handler.nextChunkIndex)
        handler.nextChunkIndex++
      } else {
        break
      }
    }

    // Only close if we've delivered all chunks
    if (handler.nextChunkIndex >= totalChunks) {
      this.debug(
        `Closing stream for ${requestId} - all ${totalChunks} delivered`,
      )
      handler.controller.close()
      this.streamingHandlers.delete(requestId)

      // Clean up any orphaned data for this request
      this.orphanedChunks.delete(requestId)
      this.orphanedStreamEnds.delete(requestId)
      // Also remove any stdout handler registered for this request
      this.stdoutHandlers.delete(requestId)
      this.orphanedStdout.delete(requestId)
    } else {
      this.debug(
        `NOT closing ${requestId} - only ${handler.nextChunkIndex}/${totalChunks} delivered`,
      )
    }
  }

  waitForResponse(requestId: string): Promise<WorkerPipeResponse> {
    return new Promise((resolve) => {
      this.responseWaiters.set(requestId, resolve)
    })
  }

  registerStreamingHandler(
    requestId: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
  ): void {
    this.debug(`Registering streaming handler for ${requestId}`)

    const handler = {
      chunks: new Map(),
      nextChunkIndex: 0,
      controller,
    }
    this.streamingHandlers.set(requestId, handler)

    this.debug(`Total streaming handlers: ${this.streamingHandlers.size}`)

    // Process any orphaned chunks that arrived before this handler was registered
    const orphanedChunks = this.orphanedChunks.get(requestId)
    if (orphanedChunks) {
      this.debug(
        `Processing ${orphanedChunks.length} orphaned for ${requestId}`,
      )

      for (const orphanedChunk of orphanedChunks) {
        this.processChunk(
          handler,
          orphanedChunk.chunk,
          orphanedChunk.chunkIndex,
          requestId,
        )
      }
      this.orphanedChunks.delete(requestId)
    }

    // Process any orphaned stream end that arrived before this handler was registered
    const orphanedStreamEnd = this.orphanedStreamEnds.get(requestId)
    if (orphanedStreamEnd) {
      // eslint-disable-next-line no-console
      console.log(`Processing orphaned stream end for ${requestId}`)

      this.processStreamEnd(handler, requestId, orphanedStreamEnd.totalChunks)
      // Note: processStreamEnd deletes the handler, so we're done
    }
  }

  registerStdoutHandler(
    requestId: string,
    handler: (text: string) => void,
  ): void {
    this.stdoutHandlers.set(requestId, handler)
    const orphaned = this.orphanedStdout.get(requestId)
    if (orphaned && orphaned.length > 0) {
      for (const text of orphaned) {
        handler(text)
      }
      this.orphanedStdout.delete(requestId)
    }
  }

  unregisterStdoutHandler(requestId: string): void {
    this.stdoutHandlers.delete(requestId)
    this.orphanedStdout.delete(requestId)
  }

  stop(): void {
    this.isRunning = false
  }
}

/**
 * Handle streaming response using the message router
 */
function handleStreamingResponse(
  metadata: {
    status: number
    statusText: string
    headers: Record<string, string>
  },
  requestId: string,
  messageRouter: MessageRouter,
): Response {
  const debug = (...args: unknown[]) => {
    if (LOMBOK_PIPE_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[run-worker-script]', ...args)
    }
  }
  debug(`Creating streaming response for request ${requestId}`)

  // Create the streaming response
  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      debug(`Started streaming response for ${requestId}`)

      // Register with message router
      messageRouter.registerStreamingHandler(requestId, ctrl)

      debug(`Registered streaming handler for ${requestId}`)
    },
    cancel() {
      debug(`Streaming response cancelled for ${requestId}`)
    },
  })

  // Return the Response with the streaming body
  return new Response(stream, {
    status: metadata.status,
    statusText: metadata.statusText,
    headers: new Headers(metadata.headers),
  })
}

const cacheRoot = path.join(os.tmpdir(), 'lombok-worker-cache')
if (await fs.promises.exists(cacheRoot)) {
  // Clean previous worker cache directory before starting
  if (LOMBOK_PIPE_DEBUG) {
    // eslint-disable-next-line no-console
    console.log(
      '[run-worker-script]',
      'Cleaning previous worker cache directory before starting',
    )
  }
  fs.rmdirSync(cacheRoot, { recursive: true })
}

const prepCacheRoot = path.join(os.tmpdir(), 'lombok-worker-prep-cache')
if (await fs.promises.exists(prepCacheRoot)) {
  // Clean previous worker prep cache directory before starting
  if (LOMBOK_PIPE_DEBUG) {
    // eslint-disable-next-line no-console
    console.log(
      '[run-worker-script]',
      'Cleaning previous worker prep cache directory before starting',
    )
  }
  fs.rmdirSync(prepCacheRoot, { recursive: true })
}

// Platform-aware mounts below: choose first existing path for each category
const platformAwareMounts = await (async () => {
  const flags: string[] = []

  // Mount whole /usr (read-only)
  if (await fs.promises.exists('/usr')) {
    flags.push('--bindmount_ro=/usr:/usr')
  }

  // Mount either /lib64 or /lib (read-only) depending on which exists
  if (await fs.promises.exists('/lib64')) {
    flags.push('--bindmount_ro=/lib64:/lib64')
  } else if (await fs.promises.exists('/lib')) {
    flags.push('--bindmount_ro=/lib:/lib')
  }

  // resolver
  if (await fs.promises.exists('/etc/resolv.conf')) {
    flags.push('--bindmount_ro=/etc/resolv.conf:/etc/resolv.conf')
  }

  // tsconfig for worker transpile
  if (
    await fs.promises.exists(
      '/usr/src/app/packages/core-worker/src/worker-scripts/tsconfig.worker-script.json',
    )
  ) {
    flags.push(
      '--bindmount_ro=/usr/src/app/packages/core-worker/src/worker-scripts/tsconfig.worker-script.json:/tsconfig.json',
    )
  }

  // devices
  for (const dev of ['/dev/null', '/dev/random', '/dev/urandom']) {
    if (await fs.promises.exists(dev)) {
      flags.push(`--bindmount=${dev}:${dev}`)
    }
  }

  return flags
})()

// Helper function to parse request body based on Content-Type and HTTP method
async function parseRequestBody(request: Request): Promise<unknown> {
  // Methods that typically don't have request bodies
  const methodsWithoutBody = ['GET', 'HEAD', 'DELETE', 'OPTIONS']

  if (methodsWithoutBody.includes(request.method)) {
    return undefined
  }

  // Get the Content-Type header
  const contentType = request.headers.get('Content-Type') || ''

  // Check if there's actually a body to parse
  const contentLength = request.headers.get('Content-Length')
  if (contentLength === '0' || !contentType) {
    return undefined
  }

  try {
    // Parse based on Content-Type
    if (contentType.includes('application/json')) {
      return await request.text()
    } else if (
      contentType.includes('text/plain') ||
      contentType.startsWith('text/')
    ) {
      return await request.text()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data as an object
      const formData = await request.formData()
      const formObject: Record<string, string> = {}
      for (const [key, value] of formData.entries()) {
        formObject[key] = value.toString()
      }
      return formObject
    } else {
      // Unsupported content type - log warning and try to parse as text
      if (LOMBOK_PIPE_DEBUG) {
        // eslint-disable-next-line no-console
        console.warn(
          `Unsupported Content-Type: ${contentType}. Attempting to parse as text.`,
        )
      }
      return await request.text()
    }
  } catch (error) {
    throw new Error(
      `Failed to parse request body (Content-Type: ${contentType}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

// Prepare and cache worker bundle by app/hash. Ensures only one setup runs at a time.
async function prepareWorkerBundle({
  appIdentifier,
  payloadUrl,
  bundleHash,
}: {
  appIdentifier: string
  payloadUrl: string
  bundleHash: string
}): Promise<{ cacheDir: string }> {
  const workerCacheRoot = path.join(cacheRoot, appIdentifier)
  const cacheDir = path.join(workerCacheRoot, bundleHash)
  const readyMarker = path.join(cacheDir, '.READY')
  const lockFile = path.join(workerCacheRoot, `.lock.${bundleHash}`)

  // Fast-path if already prepared
  if (await fs.promises.exists(readyMarker)) {
    return { cacheDir }
  }

  fs.mkdirSync(workerCacheRoot, { recursive: true })

  // Try to acquire lock atomically
  let haveLock = false
  try {
    fs.openSync(lockFile, 'wx')
    haveLock = true
  } catch {
    // lock exists; wait for READY up to 30s
    // intentionally empty
  }

  if (!haveLock) {
    const start = Date.now()
    const timeoutMs = 30_000
    // Busy-wait with small delay until READY appears or timeout
    while (Date.now() - start < timeoutMs) {
      if (await fs.promises.exists(readyMarker)) {
        return { cacheDir }
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    throw new Error(
      `Timed out waiting for worker bundle preparation for ${appIdentifier}@${bundleHash}`,
    )
  }

  // We have the lock; double-check another process didn't finish in between
  try {
    if (await fs.promises.exists(readyMarker)) {
      return { cacheDir }
    }

    const tmpRoot = path.join(prepCacheRoot, crypto.randomUUID())
    fs.mkdirSync(tmpRoot, { recursive: true })
    const zipPath = path.join(tmpRoot, 'worker-module.zip')
    await downloadFileToDisk(payloadUrl, zipPath)

    const unzipProc = Bun.spawn({
      cmd: ['unzip', zipPath, '-d', tmpRoot],
      stdout: 'inherit',
      stderr: 'inherit',
    })
    const unzipCode = await unzipProc.exited
    if (unzipCode !== 0) {
      throw new Error('Failed to unzip worker payload during prepare')
    }

    // Move prepared contents into versioned cacheDir
    await fs.promises.mkdir(cacheDir, { recursive: true })
    // Copy all files from tmpRoot except the zip itself into cacheDir
    for (const entry of fs.readdirSync(tmpRoot)) {
      if (entry === 'worker-module.zip') {
        continue
      }
      const src = path.join(tmpRoot, entry)
      const dest = path.join(cacheDir, entry)
      fs.cpSync(src, dest, { recursive: true })
    }

    // Copy both the wrapper script and daemon into the main app dir, to avoid an extra bindmount
    const workerDaemonDir = './worker-daemon'
    const workerDaemonPath = path.join(import.meta.dir, workerDaemonDir)
    fs.cpSync(workerDaemonPath, path.join(cacheDir, 'worker-daemon'), {
      recursive: true,
    })

    // Mark as ready
    fs.writeFileSync(readyMarker, '')

    fs.rmSync(tmpRoot, { recursive: true })
    return { cacheDir }
  } finally {
    // Release lock
    try {
      fs.rmSync(lockFile, { force: true })
    } catch {
      // ignore
    }
  }
}

// Global map to track long-running worker processes
const workerProcesses = new Map<
  string,
  {
    process: ReturnType<typeof Bun.spawn>
    requestWriter: PipeWriter
    responseReader: PipeReader
    messageRouter: MessageRouter
    requestPipePath: string
    responsePipePath: string
    lastUsed: number
  }
>()

// Cleanup function for worker processes
const cleanupWorkerProcess = async (workerId: string) => {
  const worker = workerProcesses.get(workerId)
  if (worker) {
    try {
      // Stop message router
      worker.messageRouter.stop()

      // Send shutdown signal
      await worker.requestWriter.writeShutdown()

      // Give process time to shutdown gracefully
      setTimeout(() => {
        if (!worker.process.killed) {
          worker.process.kill()
        }
      }, 1000)

      // Cleanup pipes
      await cleanupWorkerPipes(worker.requestPipePath, worker.responsePipePath)

      workerProcesses.delete(workerId)
    } catch (error) {
      console.error(`Error cleaning up worker ${workerId}:`, error)
    }
  }
}

// Periodic cleanup of idle workers (run every 5 minutes)
setInterval(
  () => {
    const now = Date.now()
    const maxIdleTime = 5 * 60 * 1000 // 5 minutes

    for (const [workerId, worker] of workerProcesses) {
      if (now - worker.lastUsed > maxIdleTime) {
        if (LOMBOK_PIPE_DEBUG) {
          // eslint-disable-next-line no-console
          console.log(
            '[run-worker-script]',
            `Cleaning up idle worker: ${workerId}`,
          )
        }
        void cleanupWorkerProcess(workerId)
      }
    }
  },
  5 * 60 * 1000,
)

// Get or create a long-running worker process
async function getOrCreateWorkerProcess(
  appIdentifier: string,
  workerIdentifier: string,
  server: IAppPlatformService,
  options: {
    printWorkerOutput?: boolean
    removeWorkerDirectory?: boolean
    printNsjailVerboseOutput?: boolean
  } = {},
): Promise<{
  requestWriter: PipeWriter
  responseReader: PipeReader
  messageRouter: MessageRouter
  workerRootPath: string
  logsDir: string
}> {
  const workerId = `${appIdentifier}--${workerIdentifier}`

  // Check if we have an existing worker
  const existingWorker = workerProcesses.get(workerId)
  if (existingWorker && !existingWorker.process.killed) {
    existingWorker.lastUsed = Date.now()
    return {
      requestWriter: existingWorker.requestWriter,
      responseReader: existingWorker.responseReader,
      messageRouter: existingWorker.messageRouter,
      workerRootPath: path.dirname(existingWorker.requestPipePath),
      logsDir: path.join(path.dirname(existingWorker.requestPipePath), 'logs'),
    }
  }

  // Create new worker process
  const executionId = `${workerIdentifier.toLowerCase()}__daemon__${Date.now()}`
  const workerRootPath = path.join(os.tmpdir(), executionId)
  const workerTmpDir = path.join(workerRootPath, '/worker-tmp')
  const logsDir = path.join(workerTmpDir, 'logs')
  const scratchDir = path.join(workerTmpDir, 'scratch')
  const outLogPath = path.join(logsDir, 'output.log')
  const errOutputPath = path.join(logsDir, 'error.json')

  // Create pipe paths
  const requestPipePath = path.join(workerTmpDir, 'request.pipe')
  const responsePipePath = path.join(workerTmpDir, 'response.pipe')
  if (LOMBOK_PIPE_DEBUG) {
    // eslint-disable-next-line no-console
    console.log('[run-worker-script]', 'requestPipePath', requestPipePath)
    // eslint-disable-next-line no-console
    console.log('[run-worker-script]', 'responsePipePath', responsePipePath)
  }

  const ensureDir = async (dir: string, mode: number) => {
    if (!(await fs.promises.exists(dir))) {
      fs.mkdirSync(dir, { recursive: true })
      fs.chmodSync(dir, mode)
    }
  }

  // Create the directories
  await Promise.all([
    ensureDir(workerRootPath, 0o1777),
    ensureDir(workerTmpDir, 0o1777),
    ensureDir(logsDir, 0o1777),
    ensureDir(scratchDir, 0o1777),

    // Create the log files
    Bun.file(outLogPath).write(''),
    Bun.file(errOutputPath).write(''),

    // Fix permissions for the jailed process (user 1001)
    fs.promises.chmod(outLogPath, 0o1777),
    fs.promises.chmod(errOutputPath, 0o1777),
  ])

  // Create bidirectional pipes
  await createWorkerPipes(requestPipePath, responsePipePath)

  const { result: workerExecutionDetails } =
    await server.getWorkerExecutionDetails(appIdentifier, workerIdentifier)

  const workerEnvVars = Object.keys(
    workerExecutionDetails.environmentVariables,
  ).reduce<string[]>(
    (acc, next) =>
      acc.concat(
        `WORKER_ENV_${next.trim()}=${workerExecutionDetails.environmentVariables[next].trim()}`,
      ),
    [],
  )

  // Prepare or reuse cached worker bundle by hash
  const { cacheDir } = await prepareWorkerBundle({
    appIdentifier,
    payloadUrl: workerExecutionDetails.payloadUrl,
    bundleHash: workerExecutionDetails.hash,
  })

  const environmentVariables = workerEnvVars.map((v) => v.trim())

  const workerModuleStartContext: WorkerModuleStartContext = {
    outputLogFilepath: '/worker-tmp/logs/output.log',
    errorLogFilepath: '/worker-tmp/logs/error.json',
    scriptPath: `/app/${workerExecutionDetails.entrypoint}`,
    workerToken: workerExecutionDetails.workerToken,
    executionId,
    workerIdentifier,
    serverBaseUrl: server.getServerBaseUrl(),
    startTimestamp: Date.now(),
    requestPipePath: '/worker-tmp/request.pipe',
    responsePipePath: '/worker-tmp/response.pipe',
  }

  await Bun.spawn({
    cmd: ['mount', '--bind', workerRootPath, workerRootPath],
    stdout: 'inherit',
    stderr: 'inherit',
  }).exited

  const proc = Bun.spawn({
    cmd: [
      'nsjail',
      '--disable_clone_newnet',
      '--disable_clone_newuser',
      '--disable_clone_newcgroup',
      '--disable_rlimits',
      '--disable_proc',
      '--tmpfsmount=/',
      '--user=1000',
      '--group=1000',
      `--bindmount=${workerTmpDir}:/worker-tmp`,
      `--bindmount_ro=${cacheDir}:/app`,
      '--bindmount_ro=/usr/src/app/node_modules:/node_modules',
      '--bindmount_ro=/usr/src/app/packages:/node_modules/@lombokapp',
      ...platformAwareMounts,
      ...environmentVariables.map((v) => `-E${v}`),
      '-EWORKER_SCRATCH_DIR=/worker-tmp/scratch',
      '-Mo',
      ...(options.printNsjailVerboseOutput ? ['-v'] : ['--quiet']),
      '--log_fd=1',
      '--',
      '/usr/local/bin/bun',
      `/app/worker-daemon/worker-daemon.ts`,
      JSON.stringify(workerModuleStartContext),
    ],
    stdout: 'inherit',
    stderr: 'inherit',
  })

  // Create pipe readers/writers
  const requestWriter = new PipeWriter(requestPipePath)
  const responseReader = new PipeReader(responsePipePath)

  // Create and start message router for this worker
  const messageRouter = new MessageRouter(responseReader)
  void messageRouter.start()

  // Store the worker process
  workerProcesses.set(workerId, {
    process: proc,
    requestWriter,
    responseReader,
    messageRouter,
    requestPipePath,
    responsePipePath,
    lastUsed: Date.now(),
  })

  // Handle process exit
  void proc.exited.then((exitCode) => {
    if (exitCode !== 0) {
      // eslint-disable-next-line no-console
      console.error(`Worker daemon ${workerId} exited with code ${exitCode}`)
    }
    void cleanupWorkerProcess(workerId)
  })

  // Give the worker a moment to start up
  await new Promise((resolve) => setTimeout(resolve, 100))

  return {
    requestWriter,
    responseReader,
    messageRouter,
    workerRootPath,
    logsDir,
  }
}

export const runWorkerScript = async ({
  requestOrTask,
  server,
  appIdentifier,
  workerIdentifier,
  workerExecutionId,
  options = {
    printWorkerOutput: true,
    removeWorkerDirectory: true,
    printNsjailVerboseOutput: false,
  },
  onStdoutChunk,
}: {
  server: IAppPlatformService
  requestOrTask: Request | AppTask
  appIdentifier: string
  workerIdentifier: string
  workerExecutionId: string
  options?: {
    printWorkerOutput?: boolean
    removeWorkerDirectory?: boolean
    printNsjailVerboseOutput?: boolean
  }
  onStdoutChunk?: (text: string) => void
}): Promise<Response | undefined> => {
  const overallStartTime = performance.now()
  const isRequest = requestOrTask instanceof Request

  try {
    // Get or create long-running worker process
    const {
      requestWriter,
      messageRouter: workerMessageRouter,
      logsDir,
    } = await getOrCreateWorkerProcess(
      appIdentifier,
      workerIdentifier,
      server,
      options,
    )

    // Generate unique request ID
    const requestId = `${workerExecutionId}__${Date.now()}_${crypto.randomUUID()}`

    // Serialize the request or task for the pipe
    let serializedRequestOrTask: SerializeableRequest | AppTask

    if (isRequest) {
      const request = requestOrTask
      const parsedBody = await parseRequestBody(request)
      const bodyString =
        typeof parsedBody === 'string'
          ? parsedBody
          : JSON.stringify(parsedBody ?? '')

      serializedRequestOrTask = {
        url: request.url.replace(
          new RegExp(`/worker-api/${workerIdentifier}`),
          '',
        ), // Trim the "/worker-api/${workerIdentifier}" prefix
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: bodyString,
      }
    } else {
      serializedRequestOrTask = requestOrTask
    }

    // Create per-request log files and paths (host paths)
    const hostOutLogPath = path.join(logsDir, `${requestId}.out.log`)
    const hostErrLogPath = path.join(logsDir, `${requestId}.error.json`)
    await Promise.all([
      Bun.file(hostOutLogPath).write(''),
      Bun.file(hostErrLogPath).write(''),
      fs.promises.chmod(hostOutLogPath, 0o666),
      fs.promises.chmod(hostErrLogPath, 0o666),
    ])

    // Jail-visible paths
    const jailOutLogPath = `/worker-tmp/logs/${requestId}.out.log`
    const jailErrLogPath = `/worker-tmp/logs/${requestId}.error.json`

    // Create pipe request
    const pipeRequest: WorkerPipeRequest = {
      id: requestId,
      type: isRequest ? 'request' : 'task',
      timestamp: Date.now(),
      data: serializedRequestOrTask,
      outputLogFilepath: jailOutLogPath,
      errorLogFilepath: jailErrLogPath,
      // Extract app identifier and auth token from request
      ...(isRequest &&
        (() => {
          const request = requestOrTask
          return {
            authToken: request.headers
              .get('Authorization')
              ?.replace('Bearer ', ''),
            appIdentifier,
          }
        })()),
    }

    // Send request to worker
    const requestStartTime = performance.now()
    await requestWriter.writeRequest(pipeRequest)

    // Optionally subscribe to live stdout streaming
    if (onStdoutChunk) {
      workerMessageRouter.registerStdoutHandler(requestId, (text) => {
        try {
          onStdoutChunk(text)
        } catch {
          void 0
        }
      })
    }

    // Wait for response using the worker's message router
    const pipeResponse = await workerMessageRouter.waitForResponse(requestId)

    const requestEndTime = performance.now()
    const requestTime = requestEndTime - requestStartTime

    // Handle response
    if (!pipeResponse.success) {
      const error = pipeResponse.error
      if (!error) {
        throw new Error('Response marked as failed but no error provided')
      }
      console.log(
        `[TIMING] Worker execution failed via pipe - Request: ${requestTime.toFixed(2)}ms, Overall: ${(requestEndTime - overallStartTime).toFixed(2)}ms`,
      )

      throw new WorkerScriptRuntimeError(
        `Worker execution failed: ${error.message}`,
        {
          className: 'WorkerScriptRuntimeError',
          name: error.name,
          message: error.message,
          stack: error.stack ?? '',
        },
      )
    }

    if (!isRequest) {
      // Task execution completed
      console.log(
        `[TIMING] Task execution completed via pipe - Request: ${requestTime.toFixed(2)}ms, Overall: ${(requestEndTime - overallStartTime).toFixed(2)}ms`,
      )
      if (onStdoutChunk) {
        workerMessageRouter.unregisterStdoutHandler(requestId)
      }
      return undefined
    }

    if (!pipeResponse.response) {
      throw new Error('No response data received for request')
    }

    console.log(
      `[TIMING] Request execution completed via pipe - Request: ${requestTime.toFixed(2)}ms, Overall: ${(requestEndTime - overallStartTime).toFixed(2)}ms`,
    )

    // Handle different response types
    // Debug-only: received response summary
    if (LOMBOK_PIPE_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[run-worker-script]', 'Received response from worker')
    }

    const responseData = pipeResponse.response

    // Check if this is a serialized streaming response
    if (
      typeof responseData === 'object' &&
      'isStreaming' in responseData &&
      responseData.isStreaming
    ) {
      // eslint-disable-next-line no-console
      if (LOMBOK_PIPE_DEBUG) {
        // eslint-disable-next-line no-console
        console.log('[run-worker-script]', 'Handling streaming response')
      }
      const response = handleStreamingResponse(
        responseData as {
          status: number
          statusText: string
          headers: Record<string, string>
        },
        requestId,
        workerMessageRouter,
      )
      // The stdout handler remains active until stream_end closes the stream; caller may still receive stdout
      return response
    }

    // Check if this is already a Response object
    if (responseData instanceof Response) {
      if (onStdoutChunk) {
        workerMessageRouter.unregisterStdoutHandler(requestId)
      }
      return responseData
    }

    // Check if this is a serialized static Response that needs reconstruction
    if (
      typeof responseData === 'object' &&
      'status' in responseData &&
      'body' in responseData &&
      !('isStreaming' in responseData)
    ) {
      // eslint-disable-next-line no-console
      if (LOMBOK_PIPE_DEBUG) {
        // eslint-disable-next-line no-console
        console.log(
          '[run-worker-script]',
          'Reconstructing serialized static Response object',
        )
      }
      const serializedResponse = responseData as {
        status: number
        statusText: string
        headers: Record<string, string>
        body: string
      }
      const resp = new Response(serializedResponse.body, {
        status: serializedResponse.status,
        statusText: serializedResponse.statusText || '',
        headers: new Headers(serializedResponse.headers),
      })
      if (onStdoutChunk) {
        workerMessageRouter.unregisterStdoutHandler(requestId)
      }
      return resp
    }

    // No response data
    if (onStdoutChunk) {
      workerMessageRouter.unregisterStdoutHandler(requestId)
    }
    return new Response(null, { status: 204 })
  } catch (error) {
    const overallEndTime = performance.now()
    const overallTime = overallEndTime - overallStartTime
    console.log(
      `[TIMING] Worker execution failed - Overall: ${overallTime.toFixed(2)}ms`,
    )
    if (LOMBOK_PIPE_DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[run-worker-script]', error)
    }
    if (error instanceof WorkerScriptRuntimeError) {
      throw error
    }

    throw new ScriptExecutionError('Failed to execute worker via pipe', {
      parseError: error instanceof Error ? error.message : String(error),
      exitCode: undefined,
    })
  }
}

// Gracefully stop all active nsjail worker sandboxes for this process
export async function shutdownAllWorkerSandboxes(): Promise<void> {
  const ids = Array.from(workerProcesses.keys())
  await Promise.all(ids.map((id) => cleanupWorkerProcess(id)))
}
