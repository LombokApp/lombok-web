import { type SerializeableRequest } from '@lombokapp/app-worker-sdk'
import type { JsonSerializableObject, TaskDTO } from '@lombokapp/types'
import type {
  ServerlessWorkerExecConfig,
  WorkerModuleStartContext,
  WorkerPipeMessage,
  WorkerPipeRequest,
  WorkerPipeResponse,
} from '@lombokapp/worker-utils'
import { AsyncWorkError, downloadFileToDisk } from '@lombokapp/worker-utils'
import fs from 'fs'
import os from 'os'
import path from 'path'

import {
  cleanupWorkerPipes,
  createWorkerPipes,
  PipeReader,
  PipeWriter,
} from './worker-daemon/pipe-utils'

const LOMBOK_PIPE_DEBUG = false as boolean
const MAX_WORKER_IDLE_TIME = 5 * 60 * 1000 // 5 minutes

/**
 * Message router that handles all pipe messages and routes them to appropriate handlers
 */
class MessageRouter {
  private readonly responseWaiters = new Map<
    string,
    {
      resolve: (response: WorkerPipeResponse) => void
      reject: (error: Error) => void
    }
  >()
  private readonly streamingHandlers = new Map<
    string,
    {
      chunks: Map<number, Uint8Array>
      nextChunkIndex: number
      totalChunks?: number
      controller: ReadableStreamDefaultController<Uint8Array>
      onComplete?: () => void
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
  private stopError: Error | null = null

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
        this.abortPendingRequests(
          error instanceof Error ? error : new Error(String(error)),
        )
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
          waiter.resolve(response)
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
        this.stop(new Error('Worker daemon shutdown'))
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
      onComplete?: () => void
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
      if (handler.onComplete) {
        handler.onComplete()
      }
    } else {
      this.debug(
        `NOT closing ${requestId} - only ${handler.nextChunkIndex}/${totalChunks} delivered`,
      )
    }
  }

  waitForResponse(requestId: string): Promise<WorkerPipeResponse> {
    if (this.stopError) {
      return Promise.reject(this.stopError)
    }
    return new Promise((resolve, reject) => {
      this.responseWaiters.set(requestId, { resolve, reject })
    })
  }

  registerStreamingHandler(
    requestId: string,
    controller: ReadableStreamDefaultController<Uint8Array>,
    onComplete?: () => void,
  ): void {
    this.debug(`Registering streaming handler for ${requestId}`)

    const handler = {
      chunks: new Map(),
      nextChunkIndex: 0,
      controller,
      onComplete,
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

  private abortPendingRequests(reason: Error): void {
    if (this.stopError) {
      return
    }
    this.stopError = reason
    this.isRunning = false

    for (const waiter of this.responseWaiters.values()) {
      waiter.reject(reason)
    }
    this.responseWaiters.clear()

    for (const handler of this.streamingHandlers.values()) {
      try {
        handler.controller.error(reason)
      } catch {
        // ignore
      }
      if (handler.onComplete) {
        handler.onComplete()
      }
    }
    this.streamingHandlers.clear()
    this.orphanedChunks.clear()
    this.orphanedStreamEnds.clear()
    this.stdoutHandlers.clear()
    this.orphanedStdout.clear()
  }

  stop(reason?: Error): void {
    this.abortPendingRequests(reason ?? new Error('Message router stopped'))
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
  onComplete?: () => void,
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
      messageRouter.registerStreamingHandler(requestId, ctrl, onComplete)

      debug(`Registered streaming handler for ${requestId}`)
    },
    cancel() {
      debug(`Streaming response cancelled for ${requestId}`)
      if (onComplete) {
        onComplete()
      }
    },
  })

  // Ensure we have a proper Content-Type header for streaming responses
  const headers = new Headers(metadata.headers)
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  // Return the Response with the streaming body
  return new Response(stream, {
    status: metadata.status,
    statusText: metadata.statusText,
    headers,
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

// Ensure a symlinked mirror of all @lombokapp/* workspace packages exists at
// <repoRoot>/.linked-node-modules/@lombokapp, where each child symlink points
// to the respective package root directory. This lets the jailed worker see
// monorepo packages at /node_modules/@lombokapp regardless of Bun hoisting.
async function findRepoRoot(
  startDir: string = import.meta.dir,
): Promise<string> {
  let dir = path.resolve(startDir)
  const fsRoot = path.parse(dir).root

  // Walk up until we find a directory that has both `packages` and `package.json`
  // which should represent the monorepo root (e.g., /usr/src/app)

  // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  while (true) {
    const hasPackages = await fs.promises.exists(path.join(dir, 'packages'))
    const hasPackageJson = await fs.promises.exists(
      path.join(dir, 'package.json'),
    )
    if (hasPackages && hasPackageJson) {
      return dir
    }
    const parent = path.dirname(dir)
    if (parent === dir || dir === fsRoot) {
      throw new Error(`Monorepo root not found when starting from ${startDir}`)
    }
    dir = parent
  }
}

/**
 * Gets a deterministic path in /tmp for the linked node modules directory.
 * Uses a hash of the repo root to create a unique but stable directory name.
 */
async function getLinkedNodeModulesPath(repoRoot: string): Promise<string> {
  const crypto = await import('crypto')
  const repoHash = crypto
    .createHash('sha256')
    .update(repoRoot)
    .digest('hex')
    .substring(0, 16)
  return path.join(
    os.tmpdir(),
    `lombok-linked-node-modules-${repoHash}`,
    '.linked-node-modules',
  )
}

async function ensureLombokSymlinkMirror(mirrorRoot: string): Promise<string> {
  const repoRoot = await findRepoRoot()
  const mirrorScopeDir = path.join(mirrorRoot, '@lombokapp')
  await fs.promises.mkdir(mirrorScopeDir, { recursive: true })

  // Only include nominated first-level packages under ./packages
  const pkgsRoot = path.join(repoRoot, 'packages')
  const allowedPackages: { name: string; dirName: string }[] = [
    { name: '@lombokapp/app-worker-sdk', dirName: 'app-worker-sdk' },
    { name: '@lombokapp/utils', dirName: 'utils' },
    { name: '@lombokapp/types', dirName: 'types' },
    { name: '@lombokapp/worker-utils', dirName: 'worker-utils' },
  ]
  const found: { name: string; dir: string }[] = []
  for (const allowed of allowedPackages) {
    const pkgDir = path.join(pkgsRoot, allowed.dirName)
    try {
      const stat = await fs.promises.lstat(pkgDir)
      if (stat.isDirectory()) {
        found.push({ name: allowed.name, dir: pkgDir })
      }
    } catch {
      // package directory does not exist; skip
    }
  }

  // Sync mirror: each package becomes a symlink under the scope directory
  const desired = new Set<string>()
  for (const { name, dir } of found) {
    const scopeName = name.split('/')[1] || ''
    if (!scopeName) {
      continue
    }
    const linkPath = path.join(mirrorScopeDir, scopeName)
    desired.add(linkPath)

    try {
      const lst = await fs.promises.lstat(linkPath).catch(() => undefined)
      if (lst?.isSymbolicLink()) {
        const currentTarget = await fs.promises
          .readlink(linkPath)
          .catch(() => '')
        const resolvedCurrent = path.resolve(
          path.dirname(linkPath),
          currentTarget,
        )
        const resolvedDesired = path.resolve(dir)
        if (resolvedCurrent !== resolvedDesired) {
          await fs.promises.rm(linkPath, { force: true })
          await fs.promises.symlink(resolvedDesired, linkPath, 'dir')
        }
      } else {
        if (lst) {
          await fs.promises.rm(linkPath, {
            force: true,
            recursive: lst.isDirectory(),
          })
        }
        await fs.promises.symlink(path.resolve(dir), linkPath, 'dir')
      }
    } catch {
      // As a last resort, attempt to create the symlink afresh
      try {
        await fs.promises.symlink(path.resolve(dir), linkPath, 'dir')
      } catch {
        // ignore if we can't create; mount step will fail later if necessary
      }
    }
  }

  // Remove stale entries
  try {
    const existing = await fs.promises.readdir(mirrorScopeDir)
    for (const entry of existing) {
      const full = path.join(mirrorScopeDir, entry)
      if (!desired.has(full)) {
        await fs.promises.rm(full, { force: true, recursive: true })
      }
    }
  } catch {
    // ignore
  }

  return mirrorScopeDir
}

const STATIC_NODE_MODULES_TO_LINK = [
  'openapi-fetch',
  'socket.io-client',
  'pg',
  'drizzle-orm',
  'drizzle-kit',
] as const

async function ensureLinkedNodeModulesMirror(): Promise<string> {
  const repoRoot = await findRepoRoot()
  const mirrorRoot = await getLinkedNodeModulesPath(repoRoot)
  await fs.promises.mkdir(mirrorRoot, { recursive: true })

  // 1) Ensure @lombokapp scope subtree exists and is synced
  await ensureLombokSymlinkMirror(mirrorRoot)

  // 2) Link selected static packages into mirror root
  // Helper to resolve a package by name from Bun's isolated linker location
  // Uses bun.lock to find the exact version, then resolves to .bun/package-name@version/node_modules/package-name
  const resolvePkgDir = async (
    pkgName: string,
  ): Promise<string | undefined> => {
    const nmBase = path.join(repoRoot, 'node_modules', '.bun')
    const lockfilePath = path.join(repoRoot, 'bun.lock')

    // Read and parse bun.lock to get the exact version
    // bun.lock may have trailing commas, so we need to clean it up first
    const lockfileContent = await fs.promises.readFile(lockfilePath, 'utf8')
    // Remove trailing commas before } or ] to make it valid JSON
    const cleaned = lockfileContent.replace(/,(\s*[}\]])/g, '$1')
    const lockfile = JSON.parse(cleaned) as {
      packages?: Record<string, unknown[]>
    }
    // Look up the package in the lockfile
    const pkgEntry = lockfile.packages?.[pkgName]
    if (!pkgEntry || !Array.isArray(pkgEntry) || pkgEntry.length === 0) {
      return undefined
    }

    // First element is the versioned package identifier (e.g., "drizzle-orm@0.44.7")
    const versionedId = pkgEntry[0]
    if (typeof versionedId !== 'string' || !versionedId.includes('@')) {
      return undefined
    }

    // Extract the version part and construct the directory name
    // The lockfile has "@types/pg@8.15.6" but .bun stores it as "@types+pg@8.15.6"
    // Also, Bun may add a hash suffix like "drizzle-orm@0.44.7+a43305ce07db02c9"
    // So we need to replace / with + and then search for directories starting with that
    const baseDirName = versionedId.replace(/\//g, '+')

    // Try exact match first, then search for directories starting with the base name
    let versionDir: string | undefined
    const exactPath = path.join(nmBase, baseDirName)
    if (await fs.promises.exists(exactPath)) {
      versionDir = exactPath
    } else {
      // Search for directories that start with the base name (may have hash suffix)
      const entries = await fs.promises.readdir(nmBase)
      for (const entry of entries) {
        if (entry.startsWith(baseDirName)) {
          const candidate = path.join(nmBase, entry)
          const stat = await fs.promises.lstat(candidate)
          if (stat.isDirectory()) {
            versionDir = candidate
            break
          }
        }
      }
    }

    if (versionDir) {
      const packagePath = path.join(versionDir, 'node_modules', pkgName)
      if (await fs.promises.exists(packagePath)) {
        return packagePath
      }
    }

    return undefined
  }

  const ensureLinkAt = async (
    pkgName: string,
    targetDir: string,
  ): Promise<string> => {
    const isScoped = pkgName.startsWith('@')
    const linkPath = isScoped
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        path.join(mirrorRoot, pkgName.split('/')[0]!, pkgName.split('/')[1]!)
      : path.join(mirrorRoot, pkgName)

    // Ensure scope dir exists if scoped
    if (isScoped) {
      await fs.promises.mkdir(path.dirname(linkPath), { recursive: true })
    }

    const desired = path.resolve(targetDir)
    const lst = await fs.promises.lstat(linkPath).catch(() => undefined)
    if (lst?.isSymbolicLink()) {
      const curTarget = await fs.promises.readlink(linkPath).catch(() => '')
      const resolvedCurrent = path.resolve(path.dirname(linkPath), curTarget)
      if (resolvedCurrent !== desired) {
        await fs.promises.rm(linkPath, { force: true })
        await fs.promises.symlink(desired, linkPath, 'dir')
      }
    } else {
      if (lst) {
        await fs.promises.rm(linkPath, {
          force: true,
          recursive: lst.isDirectory(),
        })
      }
      await fs.promises.symlink(desired, linkPath, 'dir')
    }
    return linkPath
  }

  const desiredStatic = new Set<string>()
  for (const pkgName of STATIC_NODE_MODULES_TO_LINK) {
    const dir = await resolvePkgDir(pkgName)
    if (!dir) {
      continue
    }
    const linkPath = await ensureLinkAt(pkgName, dir)
    desiredStatic.add(linkPath)
  }

  // Prune stale entries we manage at the top level (only among STATIC_NODE_MODULES_TO_LINK)
  for (const pkgName of STATIC_NODE_MODULES_TO_LINK) {
    const isScoped = pkgName.startsWith('@')
    const candidate = isScoped
      ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        path.join(mirrorRoot, pkgName.split('/')[0]!, pkgName.split('/')[1]!)
      : path.join(mirrorRoot, pkgName)
    if (!desiredStatic.has(candidate)) {
      // Remove file only if present and we own the slot
      const exists = await fs.promises.lstat(candidate).catch(() => undefined)
      if (exists) {
        await fs.promises.rm(candidate, { force: true, recursive: true })
      }
    }
  }

  // Return mirror root which represents a node_modules directory
  return mirrorRoot
}

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
  } catch (error) {
    console.error('Failed to prepare worker bundle:', error)
    throw error
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
    activeRequests: number
  }
>()

// Map to track creation promises to prevent duplicate daemon creation
const workerCreationPromises = new Map<
  string,
  Promise<{
    requestWriter: PipeWriter
    responseReader: PipeReader
    messageRouter: MessageRouter
    workerRootPath: string
    logsDir: string
    workerId: string
  }>
>()

// Cleanup function for worker processes
const cleanupWorkerProcess = async (workerId: string) => {
  const worker = workerProcesses.get(workerId)
  if (!worker) {
    return
  }

  // Remove from map immediately to prevent reuse during shutdown
  workerProcesses.delete(workerId)

  try {
    // Stop message router
    worker.messageRouter.stop(new Error('Worker process cleaned up'))

    // Send shutdown signal (may fail if process already exited)
    try {
      await worker.requestWriter.writeShutdown()
    } catch {
      // ignore
    }

    // Give process time to shutdown gracefully
    setTimeout(() => {
      if (!worker.process.killed) {
        worker.process.kill()
      }
    }, 1000)

    // Cleanup pipes
    await cleanupWorkerPipes(worker.requestPipePath, worker.responsePipePath)
  } catch (error) {
    console.error(`Error cleaning up worker ${workerId}:`, error)
  }
}

// Separate function to actually create the worker process
async function createWorkerProcess(
  appIdentifier: string,
  appInstallId: string,
  workerIdentifier: string,
  serverBaseUrl: string,
  workerExecConfig: ServerlessWorkerExecConfig,
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
  workerId: string
}> {
  const workerId = `${appIdentifier}--${appInstallId}--${workerIdentifier}`

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

  const workerEnvVars = Object.keys(
    workerExecConfig.environmentVariables,
  ).reduce<string[]>(
    (acc, next) =>
      acc.concat(
        `WORKER_ENV_${next.trim()}=${workerExecConfig.environmentVariables[next]?.trim()}`,
      ),
    [],
  )

  // Prepare or reuse cached worker bundle by hash
  const { cacheDir } = await prepareWorkerBundle({
    appIdentifier,
    payloadUrl: workerExecConfig.payloadUrl,
    bundleHash: workerExecConfig.hash,
  })

  const environmentVariables = workerEnvVars.map((v) => v.trim())

  const workerModuleStartContext: WorkerModuleStartContext = {
    outputLogFilepath: '/worker-tmp/logs/output.log',
    errorLogFilepath: '/worker-tmp/logs/error.json',
    scriptPath: `/app/${workerExecConfig.entrypoint}`,
    workerToken: workerExecConfig.workerToken,
    appIdentifier,
    executionId,
    workerIdentifier,
    serverBaseUrl,
    startTimestamp: Date.now(),
    requestPipePath: '/worker-tmp/request.pipe',
    responsePipePath: '/worker-tmp/response.pipe',
  }

  await Bun.spawn({
    cmd: ['mount', '--bind', workerRootPath, workerRootPath],
    stdout: 'inherit',
    stderr: 'inherit',
  }).exited

  // Ensure a node_modules mirror exists and capture its path
  const linkedNodeModulesPath = await ensureLinkedNodeModulesMirror()

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
      `--bindmount_ro=${linkedNodeModulesPath}:/node_modules`,
      ...platformAwareMounts,
      ...environmentVariables.map((v) => `-E${v}`),
      '-EWORKER_SCRATCH_DIR=/worker-tmp/scratch',
      '-Mo',
      '--iface_no_lo',
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
    activeRequests: 0,
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
    workerId,
  }
}

// Periodic cleanup of idle workers (run every 5 minutes)
setInterval(
  () => {
    const now = Date.now()

    for (const [workerId, worker] of workerProcesses) {
      if (worker.activeRequests > 0) {
        continue
      }
      if (now - worker.lastUsed > MAX_WORKER_IDLE_TIME) {
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
  serverBaseUrl: string,
  appIdentifier: string,
  appInstallId: string,
  workerIdentifier: string,
  workerExecutionDetails: ServerlessWorkerExecConfig,
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
  workerId: string
}> {
  const workerId = `${appIdentifier}--${appInstallId}--${workerIdentifier}`

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
      workerId,
    }
  }

  // Check if another request is already creating this worker
  const existingCreationPromise = workerCreationPromises.get(workerId)
  if (existingCreationPromise) {
    // Wait for the other request to finish creating the worker
    return existingCreationPromise
  }

  // Create a new worker process (with locking)
  const creationPromise = createWorkerProcess(
    appIdentifier,
    appInstallId,
    workerIdentifier,
    serverBaseUrl,
    workerExecutionDetails,
    options,
  ).then((result) => ({
    ...result,
    workerId,
  }))
  workerCreationPromises.set(workerId, creationPromise)

  try {
    return await creationPromise
  } finally {
    // Clean up the creation promise
    workerCreationPromises.delete(workerId)
  }
}

interface RunWorkerScriptBaseArgs {
  serverBaseUrl: string
  serverlessWorkerDetails: ServerlessWorkerExecConfig
  appIdentifier: string
  appInstallId: string
  workerIdentifier: string
  workerExecutionId: string
  options?: {
    printWorkerOutput?: boolean
    removeWorkerDirectory?: boolean
    printNsjailVerboseOutput?: boolean
  }
  onStdoutChunk?: (text: string) => void
}

interface RunWorkerScriptRequestArgs extends RunWorkerScriptBaseArgs {
  requestOrTask: Request
  isSystemRequest: boolean
}

interface RunWorkerScriptTaskArgs extends RunWorkerScriptBaseArgs {
  requestOrTask: TaskDTO
}

export async function runWorker(
  args: RunWorkerScriptRequestArgs,
): Promise<Response | undefined>
export async function runWorker(
  args: RunWorkerScriptTaskArgs,
): Promise<JsonSerializableObject | undefined>
export async function runWorker(
  args: RunWorkerScriptRequestArgs | RunWorkerScriptTaskArgs,
): Promise<Response | JsonSerializableObject | undefined> {
  const {
    serverBaseUrl,
    serverlessWorkerDetails,
    requestOrTask,
    appIdentifier,
    workerIdentifier,
    appInstallId,
    workerExecutionId,
    options = {
      printWorkerOutput: true,
      removeWorkerDirectory: true,
      printNsjailVerboseOutput: false,
    },
    onStdoutChunk,
  } = args

  const overallStartTime = performance.now()
  let deferCompletion = false
  let completeRequest: (() => void) | null = null

  try {
    // Get or create long-running worker process
    const {
      requestWriter,
      messageRouter: workerMessageRouter,
      logsDir,
      workerId,
    } = await getOrCreateWorkerProcess(
      serverBaseUrl,
      appIdentifier,
      appInstallId,
      workerIdentifier,
      serverlessWorkerDetails,
      options,
    )
    const workerEntry = workerProcesses.get(workerId)
    if (workerEntry) {
      workerEntry.activeRequests += 1
    }
    let requestCompleted = false
    completeRequest = () => {
      if (requestCompleted) {
        return
      }
      requestCompleted = true
      const workerState = workerProcesses.get(workerId)
      if (workerState) {
        workerState.activeRequests = Math.max(0, workerState.activeRequests - 1)
        workerState.lastUsed = Date.now()
      }
    }

    // Generate unique request ID
    const requestId = `${workerExecutionId}__${Date.now()}_${crypto.randomUUID()}`

    // Serialize the request or task for the pipe
    let serializedRequestOrTask: SerializeableRequest | TaskDTO

    if (requestOrTask instanceof Request) {
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
      type: requestOrTask instanceof Request ? 'request' : 'task',
      isSystemRequest: 'isSystemRequest' in args ? args.isSystemRequest : false,
      timestamp: Date.now(),
      data: serializedRequestOrTask,
      outputLogFilepath: jailOutLogPath,
      errorLogFilepath: jailErrLogPath,
      // Extract app identifier and auth token from request
      ...(requestOrTask instanceof Request &&
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
      console.log(
        `[TIMING] Worker execution failed via pipe - Request: ${requestTime.toFixed(2)}ms, Overall: ${(requestEndTime - overallStartTime).toFixed(2)}ms`,
      )

      const error = pipeResponse.error
      if (!error) {
        throw new AsyncWorkError({
          name: 'InvalidWorkerError',
          origin: 'internal',
          code: 'NO_ERROR_PROVIDED',
          message: 'Response marked as failed but no error provided',
          stack: new Error().stack,
        })
      }

      throw new AsyncWorkError(error)
    }

    if (!(requestOrTask instanceof Request)) {
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
      throw new AsyncWorkError({
        name: 'InvalidWorkerResponse',
        origin: 'internal',
        code: 'NO_RESPONSE_DATA_RECEIVED',
        message: 'No response data received for request',
        stack: new Error().stack,
      })
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
        () => completeRequest?.(),
      )
      deferCompletion = true
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
    if (error instanceof AsyncWorkError) {
      throw error
    }

    throw error
  } finally {
    if (!deferCompletion && completeRequest) {
      completeRequest()
    }
  }
}

// Gracefully stop all active nsjail worker sandboxes for this process
export async function shutdownAllWorkerSandboxes(): Promise<void> {
  const ids = Array.from(workerProcesses.keys())
  await Promise.all(ids.map((id) => cleanupWorkerProcess(id)))
}
