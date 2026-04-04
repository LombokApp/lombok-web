/**
 * Integration test for the docker-bridge tunnel system using the REAL Go tunnel-agent.
 *
 * Tests the full end-to-end flow:
 *   WS client -> bridge -> tunnel-agent (real Go binary) -> HTTP server -> response back
 *
 * Instead of Docker exec, a mock adapter spawns the real compiled tunnel-agent binary
 * as a child process with piped stdin/stdout. The bridge's tunnel session handler
 * reads/writes the agent's stdin/stdout exactly like it would with a Docker exec stream.
 *
 * CRITICAL: The bridge expects Docker's 8-byte multiplexed stream format (tty=false).
 * The real tunnel-agent writes raw framed protocol to stdout. So we wrap each stdout
 * chunk in Docker demux headers before pushing to the duplex stream.
 */

import { spawn, type ChildProcess } from 'node:child_process'
import { Duplex, Transform } from 'node:stream'
import type net from 'node:net'

import type { Server } from 'bun'
import { afterAll, beforeAll, describe, expect, it } from 'bun:test'

import type { BridgeConfig } from '../config.js'
import type { DockerAdapter } from '../docker/adapter.js'
import type { AdapterPool } from '../docker/adapter-pool.js'
import { createHttpServer } from '../http-server.js'
import type { Logger } from '../logger.js'
import { SessionManager } from '../sessions/session-manager.js'
import { TunnelSessionHandler } from '../sessions/tunnel-session.js'
import { createWsServer } from '../ws-server.js'

// ---------------------------------------------------------------------------
// Test configuration
// ---------------------------------------------------------------------------

const API_SECRET = 'e2e-tunnel-secret'
const JWT_SECRET = 'e2e-tunnel-jwt'

/**
 * Path to the real compiled Go tunnel-agent binary.
 * Compiled in beforeAll via `go build`.
 */
const TUNNEL_AGENT_BIN = '/tmp/tunnel-agent-test-bin'

/** Tracked child processes for cleanup */
const childProcesses: ChildProcess[] = []

function makeConfig(overrides: Partial<BridgeConfig> = {}): BridgeConfig {
  return {
    httpPort: 0,
    wsPort: 0,
    bridgeApiSecret: API_SECRET,
    bridgeJwtSecret: JWT_SECRET,
    bridgeJwtExpiry: 3600,
    dockerHosts: {
      default: { type: 'docker_endpoint', host: '/var/run/docker.sock' },
    },
    logLevel: 'error',
    maxSessions: 50,
    maxConcurrentPerSession: 10,
    sessionIdleTimeout: 1800000,
    ephemeralGracePeriod: 5000,
    ...overrides,
  }
}

function makeLogger(): Logger {
  return {
    info() {},
    warn() {},
    error(...args: unknown[]) {
      // Uncomment for debugging:
      // console.error('[bridge]', ...args)
    },
    debug() {},
  }
}

// ---------------------------------------------------------------------------
// Docker demux header wrapper
// ---------------------------------------------------------------------------

/**
 * Wraps raw data in Docker's 8-byte multiplexed stream header.
 * Format: [stream_type: 1 byte][0x00 0x00 0x00][length: 4 bytes BE][payload]
 *
 * The bridge's createDemuxer strips these headers before feeding data to the
 * protocol parser. Since the real tunnel-agent writes raw framed protocol to
 * stdout (no Docker headers), we must add them.
 */
function wrapDockerDemux(streamType: number, payload: Buffer): Buffer {
  const header = Buffer.alloc(8)
  header[0] = streamType // 1=stdout, 2=stderr
  header.writeUInt32BE(payload.length, 4)
  return Buffer.concat([header, payload])
}

// ---------------------------------------------------------------------------
// Mock adapter: spawns the REAL Go tunnel-agent binary
// ---------------------------------------------------------------------------

function spawnRealAgent(targetPort: number): net.Socket {
  const child = spawn(
    TUNNEL_AGENT_BIN,
    ['--ports', String(targetPort), '--log-level', 'warn', '--health-port', '0'],
    {
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env },
    },
  )

  childProcesses.push(child)

  // Create a Duplex stream that:
  // - Reads from child stdout (wrapped in Docker demux headers)
  // - Writes to child stdin (raw framed protocol, as the bridge sends it)
  const duplex = new Duplex({
    read() {},
    write(
      chunk: Buffer,
      _encoding: string,
      callback: (err?: Error | null) => void,
    ) {
      if (child.stdin && !child.stdin.destroyed) {
        child.stdin.write(chunk, callback)
      } else {
        callback(new Error('child stdin destroyed'))
      }
    },
    final(callback: (err?: Error | null) => void) {
      if (child.stdin) {
        child.stdin.end(callback)
      } else {
        callback()
      }
    },
  })

  // Wrap each stdout chunk in Docker demux headers (stream type 1 = stdout)
  child.stdout!.on('data', (data: Buffer) => {
    const wrapped = wrapDockerDemux(1, data)
    duplex.push(wrapped)
  })
  child.stdout!.on('end', () => {
    duplex.push(null)
  })

  // Log stderr for debugging (tunnel-agent logs go here)
  child.stderr!.on('data', (data: Buffer) => {
    // Uncomment for debugging:
    // process.stderr.write(`[tunnel-agent] ${data}`)
  })

  child.on('exit', (code) => {
    if (!duplex.destroyed) {
      duplex.push(null)
      duplex.destroy()
    }
  })

  const socket = duplex as unknown as net.Socket
  return socket
}

function createMockAdapterForPort(targetPort: number): DockerAdapter {
  return {
    async createExec() {
      return 'mock-exec-id-' + Math.random().toString(36).slice(2, 8)
    },
    async startExec() {
      return spawnRealAgent(targetPort)
    },
    async resizeExec() {},
    async inspectExec() {
      return { running: false, exitCode: 0, pid: 0 }
    },
    async listContainers() {
      return []
    },
    async killExec() {},
    async ping() {
      return true
    },
    async execSync() {
      return { stdout: '', stderr: '', exitCode: 0 }
    },
    async createContainer() {
      return {
        id: 'mock-id',
        image: 'mock-image',
        labels: {},
        state: 'running',
        reusable: true,
        createdAt: new Date().toISOString(),
        names: ['/mock'],
      }
    },
    async startContainer() {},
    async stopContainer() {},
    async restartContainer() {},
    async removeContainer() {},
    async getContainerInspect() {
      return {}
    },
    async getContainerStats() {
      return {}
    },
    async getContainerLogs() {
      return []
    },
    async isContainerRunning() {
      return false
    },
    async listContainersByLabels() {
      return []
    },
    async testConnection() {
      return { success: true }
    },
    async getHostResources() {
      return { info: {} }
    },
    async pullImage() {},
  }
}

function createMockAdapterPool(targetPort: number): AdapterPool {
  const adapter = createMockAdapterForPort(targetPort)
  return {
    get: () => adapter,
    has: () => true,
    hostIds: () => ['default'],
  } as unknown as AdapterPool
}

function authHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${API_SECRET}` }
}

// ---------------------------------------------------------------------------
// Response types
// ---------------------------------------------------------------------------

interface SessionResponse {
  id: string
  container_id: string
  protocol: string
  mode: string
  state: string
  public_id: string
  label: string
  app_id: string
  agent_ready: boolean
}

// ---------------------------------------------------------------------------
// Helper: sign tunnel JWT
// ---------------------------------------------------------------------------

async function signTunnelJWT(
  publicId: string,
  secret: string = JWT_SECRET,
  ttl = 3600,
): Promise<string> {
  const encoder = new TextEncoder()
  const now = Math.floor(Date.now() / 1000)
  const payload = { public_id: publicId, iat: now, exp: now + ttl }
  const headerB64 = Buffer.from(
    JSON.stringify({ alg: 'HS256', typ: 'JWT' }),
  ).toString('base64url')
  const payloadB64 = Buffer.from(JSON.stringify(payload)).toString('base64url')
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const sig = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(`${headerB64}.${payloadB64}`),
  )
  return `${headerB64}.${payloadB64}.${Buffer.from(new Uint8Array(sig)).toString('base64url')}`
}

// ---------------------------------------------------------------------------
// WS client helper for the framed tunnel protocol
// ---------------------------------------------------------------------------

interface TunnelResponse {
  statusCode: number
  headers: Record<string, string>
  body: string
}

interface PendingResponse {
  resolve: (resp: TunnelResponse) => void
  reject: (err: Error) => void
  meta: { status_code: number; headers: Record<string, string> } | null
  bodyChunks: Buffer[]
  /** True when the first body_follows was on the http_response itself (single body mode) */
  singleBodyMode: boolean
}

class TunnelWSClient {
  private ws: WebSocket | null = null
  private pendingResponses = new Map<string, PendingResponse>()
  private nextBinaryStreamId: string | null = null

  async connect(wsUrl: string, sessionId: string, token: string): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      const url = `${wsUrl}/sessions/${sessionId}/attach?token=${token}`
      this.ws = new WebSocket(url)
      this.ws.binaryType = 'arraybuffer'

      const timeout = setTimeout(() => {
        reject(new Error('WS connect timeout'))
      }, 5000)

      this.ws.onopen = () => {
        clearTimeout(timeout)
        resolve()
      }
      this.ws.onerror = (evt) => {
        clearTimeout(timeout)
        reject(new Error(`WS error: ${evt}`))
      }

      this.ws.onmessage = (evt) => {
        this.handleMessage(evt.data)
      }
    })
  }

  private handleMessage(data: unknown): void {
    if (data instanceof ArrayBuffer) {
      this.handleBinaryMessage(data)
      return
    }

    if (typeof data === 'string') {
      try {
        const msg = JSON.parse(data)
        this.handleEnvelope(msg)
      } catch {
        // ignore parse errors
      }
    }
  }

  private handleEnvelope(msg: Record<string, unknown>): void {
    const streamId = msg.stream_id as string
    if (!streamId) return

    if (msg.type === 'http_response') {
      const pending = this.pendingResponses.get(streamId)
      if (!pending) return

      if (msg.body_follows) {
        pending.meta = {
          status_code: msg.status_code as number,
          headers: msg.headers as Record<string, string>,
        }
        // If body_len > 0, the Go agent sends the body as body_chunk + body_end
        // for streaming responses, or as a single binary for buffered responses.
        // For streaming responses: http_response (body_follows) -> body_chunk* -> body_end
        // For buffered responses: http_response (body_follows, body_len) -> body_chunk -> body_end
        // In all cases from the real Go agent, body data comes via body_chunk frames.
        // The bridge forwards body_chunk text frames + binary data to the WS client.
        // We should NOT expect a bare binary here; body arrives via body_chunk flow.
        pending.singleBodyMode = false
        this.nextBinaryStreamId = streamId
      } else {
        this.pendingResponses.delete(streamId)
        pending.resolve({
          statusCode: msg.status_code as number,
          headers: (msg.headers as Record<string, string>) || {},
          body: '',
        })
      }
    } else if (msg.type === 'body_chunk') {
      const pending = this.pendingResponses.get(streamId)
      if (pending) {
        this.nextBinaryStreamId = streamId
      }
    } else if (msg.type === 'body_end') {
      const pending = this.pendingResponses.get(streamId)
      if (pending) {
        this.pendingResponses.delete(streamId)
        const body =
          pending.bodyChunks.length > 0
            ? Buffer.concat(pending.bodyChunks).toString('utf8')
            : ''
        pending.resolve({
          statusCode: pending.meta?.status_code ?? 200,
          headers: pending.meta?.headers ?? {},
          body,
        })
      }
    } else if (msg.type === 'stream_close') {
      const pending = this.pendingResponses.get(streamId)
      if (pending) {
        this.pendingResponses.delete(streamId)
        pending.reject(
          new Error(`Stream closed: ${(msg.reason as string) ?? 'unknown'}`),
        )
      }
    }
  }

  private handleBinaryMessage(data: ArrayBuffer): void {
    const streamId = this.nextBinaryStreamId
    this.nextBinaryStreamId = null

    if (!streamId) return

    const pending = this.pendingResponses.get(streamId)
    if (!pending) return

    const buf = Buffer.from(data)
    pending.bodyChunks.push(buf)
  }

  async httpRequest(
    method: string,
    pathStr: string,
    headers: Record<string, string> = {},
    body?: string,
  ): Promise<TunnelResponse> {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      throw new Error('WebSocket not connected')
    }

    const streamId = crypto.randomUUID()

    return new Promise<TunnelResponse>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingResponses.delete(streamId)
        reject(new Error('HTTP request timeout (10s)'))
      }, 10_000)

      this.pendingResponses.set(streamId, {
        resolve: (resp) => {
          clearTimeout(timeout)
          resolve(resp)
        },
        reject: (err) => {
          clearTimeout(timeout)
          reject(err)
        },
        meta: null,
        bodyChunks: [],
        singleBodyMode: false,
      })

      const envelope: Record<string, unknown> = {
        type: 'http_request',
        stream_id: streamId,
        method,
        path: pathStr,
        headers,
      }

      if (body) {
        const bodyBuf = Buffer.from(body)
        envelope.body_follows = true
        envelope.body_len = bodyBuf.length
        this.ws!.send(JSON.stringify(envelope))
        this.ws!.send(bodyBuf)
      } else {
        this.ws!.send(JSON.stringify(envelope))
      }
    })
  }

  close(): void {
    if (this.ws) {
      this.ws.close()
      this.ws = null
    }
    for (const [, pending] of this.pendingResponses) {
      pending.reject(new Error('Client closed'))
    }
    this.pendingResponses.clear()
  }
}

// ---------------------------------------------------------------------------
// Test suite
// ---------------------------------------------------------------------------

describe('Tunnel Agent Integration E2E (real Go binary)', () => {
  let mockServer: ReturnType<typeof Bun.serve>
  let mockServerPort: number
  let httpServer: Server<unknown>
  let wsServer: Server<unknown>
  let httpBaseUrl: string
  let wsBaseUrl: string
  let sessionManager: SessionManager
  let tunnelHandler: TunnelSessionHandler
  let config: BridgeConfig

  beforeAll(async () => {
    // 1. Start mock HTTP target server
    mockServer = Bun.serve({
      port: 0,
      fetch(req) {
        const url = new URL(req.url)

        if (url.pathname === '/health/ready') {
          return Response.json({ ready: true })
        }

        if (req.method === 'GET' && url.pathname === '/echo') {
          return Response.json({ message: 'hello' })
        }

        if (req.method === 'POST' && url.pathname === '/echo-body') {
          return req.text().then((body) => Response.json({ echo: body }))
        }

        if (req.method === 'GET' && url.pathname === '/sse') {
          const stream = new ReadableStream({
            start(controller) {
              const encoder = new TextEncoder()
              controller.enqueue(
                encoder.encode('event: msg\ndata: {"text":"hello"}\n\n'),
              )
              controller.enqueue(
                encoder.encode('event: msg\ndata: {"text":"world"}\n\n'),
              )
              controller.enqueue(
                encoder.encode('event: done\ndata: {}\n\n'),
              )
              controller.close()
            },
          })
          return new Response(stream, {
            headers: { 'Content-Type': 'text/event-stream' },
          })
        }

        if (req.method === 'POST' && url.pathname === '/chat-mock') {
          return req.json().then((body: unknown) => {
            const b = body as { message: string }
            const stream = new ReadableStream({
              start(controller) {
                const encoder = new TextEncoder()
                controller.enqueue(
                  encoder.encode(
                    `event: text_delta\ndata: {"text":"Echo: ${b.message}"}\n\n`,
                  ),
                )
                controller.enqueue(
                  encoder.encode('event: message_end\ndata: {}\n\n'),
                )
                controller.close()
              },
            })
            return new Response(stream, {
              headers: { 'Content-Type': 'text/event-stream' },
            })
          })
        }

        if (url.pathname === '/status/404') {
          return new Response('Not found', { status: 404 })
        }

        if (url.pathname === '/empty') {
          return new Response(null, { status: 204 })
        }

        if (url.pathname === '/large') {
          // Generate a large response (500KB)
          const size = 500 * 1024
          const data = Buffer.alloc(size, 'A')
          return new Response(data, {
            headers: { 'Content-Type': 'application/octet-stream' },
          })
        }

        return new Response('Not found', { status: 404 })
      },
    })
    mockServerPort = mockServer.port

    // 2. Set up bridge with mock adapter that spawns the REAL Go tunnel-agent
    config = makeConfig()
    const logger = makeLogger()
    const adapterPool = createMockAdapterPool(mockServerPort)
    sessionManager = new SessionManager({
      maxSessions: config.maxSessions,
      sessionIdleTimeout: config.sessionIdleTimeout,
    })
    tunnelHandler = new TunnelSessionHandler(
      adapterPool,
      sessionManager,
      config,
      logger,
    )

    // 3. Start HTTP and WS servers
    httpServer = createHttpServer(
      config,
      sessionManager,
      tunnelHandler,
      adapterPool,
      logger,
    )
    wsServer = createWsServer(config, sessionManager, tunnelHandler, logger)

    httpBaseUrl = `http://localhost:${httpServer.port}`
    wsBaseUrl = `ws://localhost:${wsServer.port}`
  }, 30_000)

  afterAll(() => {
    // Kill all child processes
    for (const child of childProcesses) {
      try {
        child.kill('SIGTERM')
      } catch {
        // already dead
      }
    }

    sessionManager?.stopSweep()
    void httpServer?.stop()
    void wsServer?.stop()
    void mockServer?.stop()
  })

  // Helper: create a framed tunnel session via HTTP API
  async function createFramedSession(): Promise<SessionResponse> {
    const res = await fetch(`${httpBaseUrl}/sessions/tunnel`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders(),
      },
      body: JSON.stringify({
        host_id: 'default',
        container_id: 'test-container',
        command: [
          TUNNEL_AGENT_BIN,
          '--ports',
          String(mockServerPort),
        ],
        label: 'test-tunnel',
        app_id: 'test-app',
        mode: 'persistent',
        protocol: 'framed',
        public: true,
      }),
    })

    expect(res.status).toBe(201)
    return (await res.json()) as SessionResponse
  }

  // ---------------------------------------------------------------------------
  // 1. Basic connectivity
  // ---------------------------------------------------------------------------

  describe('Basic connectivity', () => {
    it('creates a framed session with agent ready', async () => {
      const session = await createFramedSession()
      expect(session.agent_ready).toBe(true)
      expect(session.state).toBe('active')
      expect(session.protocol).toBe('framed')
    }, 15_000)

    it('session becomes active after agent ready', async () => {
      const session = await createFramedSession()

      const getRes = await fetch(`${httpBaseUrl}/sessions/${session.id}`, {
        headers: authHeaders(),
      })
      expect(getRes.status).toBe(200)
      const fetched = (await getRes.json()) as SessionResponse
      expect(fetched.state).toBe('active')
      expect(fetched.agent_ready).toBe(true)
    }, 15_000)
  })

  // ---------------------------------------------------------------------------
  // 2. HTTP GET without body (via WS client)
  // ---------------------------------------------------------------------------

  describe('HTTP GET via WS', () => {
    it('proxies GET request and returns correct JSON response', async () => {
      const session = await createFramedSession()
      const client = new TunnelWSClient()

      try {
        await client.connect(wsBaseUrl, session.id, API_SECRET)

        const resp = await client.httpRequest('GET', '/echo', {})
        expect(resp.statusCode).toBe(200)

        const body = JSON.parse(resp.body) as { message: string }
        expect(body.message).toBe('hello')
      } finally {
        client.close()
      }
    }, 15_000)

    it('returns correct status code for 404', async () => {
      const session = await createFramedSession()
      const client = new TunnelWSClient()

      try {
        await client.connect(wsBaseUrl, session.id, API_SECRET)

        const resp = await client.httpRequest('GET', '/status/404', {})
        expect(resp.statusCode).toBe(404)
      } finally {
        client.close()
      }
    }, 15_000)

    it('handles 204 No Content', async () => {
      const session = await createFramedSession()
      const client = new TunnelWSClient()

      try {
        await client.connect(wsBaseUrl, session.id, API_SECRET)

        const resp = await client.httpRequest('GET', '/empty', {})
        expect(resp.statusCode).toBe(204)
        expect(resp.body).toBe('')
      } finally {
        client.close()
      }
    }, 15_000)
  })

  // ---------------------------------------------------------------------------
  // 3. HTTP POST with JSON body
  // ---------------------------------------------------------------------------

  describe('HTTP POST with body', () => {
    it('proxies POST request with JSON body', async () => {
      const session = await createFramedSession()
      const client = new TunnelWSClient()

      try {
        await client.connect(wsBaseUrl, session.id, API_SECRET)

        const resp = await client.httpRequest(
          'POST',
          '/echo-body',
          { 'content-type': 'application/json' },
          JSON.stringify({ hello: 'world' }),
        )
        expect(resp.statusCode).toBe(200)

        const body = JSON.parse(resp.body) as { echo: string }
        expect(body.echo).toBe('{"hello":"world"}')
      } finally {
        client.close()
      }
    }, 15_000)

    it('echoes request body correctly', async () => {
      const session = await createFramedSession()
      const client = new TunnelWSClient()

      try {
        await client.connect(wsBaseUrl, session.id, API_SECRET)

        const payload = 'This is a test body with special chars: <>&"'
        const resp = await client.httpRequest(
          'POST',
          '/echo-body',
          { 'content-type': 'text/plain' },
          payload,
        )
        expect(resp.statusCode).toBe(200)

        const body = JSON.parse(resp.body) as { echo: string }
        expect(body.echo).toBe(payload)
      } finally {
        client.close()
      }
    }, 15_000)
  })

  // ---------------------------------------------------------------------------
  // 4. SSE streaming response (GET)
  // ---------------------------------------------------------------------------

  describe('SSE streaming response', () => {
    it('receives all SSE events from streaming endpoint', async () => {
      const session = await createFramedSession()
      const client = new TunnelWSClient()

      try {
        await client.connect(wsBaseUrl, session.id, API_SECRET)

        const resp = await client.httpRequest('GET', '/sse', {})
        expect(resp.statusCode).toBe(200)
        expect(resp.headers['Content-Type'] || resp.headers['content-type']).toContain('text/event-stream')

        // Verify all SSE events are present
        expect(resp.body).toContain('event: msg')
        expect(resp.body).toContain('"text":"hello"')
        expect(resp.body).toContain('"text":"world"')
        expect(resp.body).toContain('event: done')
      } finally {
        client.close()
      }
    }, 15_000)
  })

  // ---------------------------------------------------------------------------
  // 5. POST with body that returns SSE stream (chat-worker pattern)
  // ---------------------------------------------------------------------------

  describe('Chat-like POST -> SSE flow', () => {
    it('sends POST with body and receives SSE streaming response', async () => {
      const session = await createFramedSession()
      const client = new TunnelWSClient()

      try {
        await client.connect(wsBaseUrl, session.id, API_SECRET)

        const resp = await client.httpRequest(
          'POST',
          '/chat-mock',
          { 'content-type': 'application/json' },
          JSON.stringify({ message: 'test-prompt' }),
        )
        expect(resp.statusCode).toBe(200)
        expect(resp.headers['Content-Type'] || resp.headers['content-type']).toContain('text/event-stream')

        expect(resp.body).toContain('Echo: test-prompt')
        expect(resp.body).toContain('event: message_end')
      } finally {
        client.close()
      }
    }, 15_000)
  })

  // ---------------------------------------------------------------------------
  // 6. Large response bodies (chunked)
  // ---------------------------------------------------------------------------

  describe('Large response bodies', () => {
    it('handles large response (500KB) correctly', async () => {
      const session = await createFramedSession()
      const client = new TunnelWSClient()

      try {
        await client.connect(wsBaseUrl, session.id, API_SECRET)

        const resp = await client.httpRequest('GET', '/large', {})
        expect(resp.statusCode).toBe(200)

        // The response should be 500KB of 'A' characters
        const expectedSize = 500 * 1024
        expect(resp.body.length).toBe(expectedSize)
        // Verify content
        expect(resp.body[0]).toBe('A')
        expect(resp.body[resp.body.length - 1]).toBe('A')
      } finally {
        client.close()
      }
    }, 15_000)
  })

  // ---------------------------------------------------------------------------
  // 7. 502 when target port unreachable
  // ---------------------------------------------------------------------------

  describe('Error handling', () => {
    it('returns 502 when target port is unreachable', async () => {
      const deadPort = 59999

      const deadConfig = makeConfig()
      const deadLogger = makeLogger()
      const deadAdapterPool = createMockAdapterPool(deadPort)
      const deadSessionManager = new SessionManager({
        maxSessions: deadConfig.maxSessions,
        sessionIdleTimeout: deadConfig.sessionIdleTimeout,
      })
      const deadTunnelHandler = new TunnelSessionHandler(
        deadAdapterPool,
        deadSessionManager,
        deadConfig,
        deadLogger,
      )

      const deadHttpServer = createHttpServer(
        deadConfig,
        deadSessionManager,
        deadTunnelHandler,
        deadAdapterPool,
        deadLogger,
      )
      const deadWsServer = createWsServer(
        deadConfig,
        deadSessionManager,
        deadTunnelHandler,
        deadLogger,
      )

      try {
        const deadBaseUrl = `http://localhost:${deadHttpServer.port}`
        const deadWsUrl = `ws://localhost:${deadWsServer.port}`

        const res = await fetch(`${deadBaseUrl}/sessions/tunnel`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${API_SECRET}`,
          },
          body: JSON.stringify({
            host_id: 'default',
            container_id: 'test-dead',
            command: [
              TUNNEL_AGENT_BIN,
              '--ports',
              String(deadPort),
            ],
            label: 'dead-tunnel',
            app_id: 'test-app',
            mode: 'persistent',
            protocol: 'framed',
            public: true,
          }),
        })

        expect(res.status).toBe(201)
        const session = (await res.json()) as SessionResponse

        const client = new TunnelWSClient()
        try {
          await client.connect(deadWsUrl, session.id, API_SECRET)

          const resp = await client.httpRequest('GET', '/anything', {})
          expect(resp.statusCode).toBe(502)
        } finally {
          client.close()
        }
      } finally {
        deadSessionManager.stopSweep()
        void deadHttpServer.stop()
        void deadWsServer.stop()
      }
    }, 15_000)
  })

  // ---------------------------------------------------------------------------
  // 8. Concurrent multiplexed requests
  // ---------------------------------------------------------------------------

  describe('Concurrent requests', () => {
    it('handles multiple concurrent HTTP requests on same tunnel', async () => {
      const session = await createFramedSession()
      const client = new TunnelWSClient()

      try {
        await client.connect(wsBaseUrl, session.id, API_SECRET)

        // Fire 5 concurrent requests
        const promises = Array.from({ length: 5 }, () =>
          client.httpRequest('GET', '/echo', {}),
        )

        const results = await Promise.all(promises)

        for (const resp of results) {
          expect(resp.statusCode).toBe(200)
          const body = JSON.parse(resp.body) as { message: string }
          expect(body.message).toBe('hello')
        }
      } finally {
        client.close()
      }
    }, 15_000)

    it('handles concurrent POST requests with different bodies', async () => {
      const session = await createFramedSession()
      const client = new TunnelWSClient()

      try {
        await client.connect(wsBaseUrl, session.id, API_SECRET)

        // Fire concurrent POST requests with unique bodies
        const promises = Array.from({ length: 3 }, (_, i) =>
          client.httpRequest(
            'POST',
            '/echo-body',
            { 'content-type': 'application/json' },
            JSON.stringify({ index: i }),
          ),
        )

        const results = await Promise.all(promises)

        // Each response should echo back the body we sent
        const echoed = results.map((r) => {
          expect(r.statusCode).toBe(200)
          const body = JSON.parse(r.body) as { echo: string }
          return JSON.parse(body.echo) as { index: number }
        })

        // All 3 indices should be present (order may vary due to concurrency)
        const indices = echoed.map((e) => e.index).sort()
        expect(indices).toEqual([0, 1, 2])
      } finally {
        client.close()
      }
    }, 15_000)
  })

  // ---------------------------------------------------------------------------
  // 9. Direct HTTP tunnel traffic (via /-/tunnel/)
  // ---------------------------------------------------------------------------

  describe('Direct HTTP tunnel traffic', () => {
    it('proxies GET through /-/tunnel/ endpoint', async () => {
      const session = await createFramedSession()
      const publicId = session.public_id
      const token = await signTunnelJWT(publicId)

      const resp = await fetch(
        `${httpBaseUrl}/-/tunnel/echo?token=${token}`,
        {
          headers: { 'X-Tunnel-Public-Id': publicId },
        },
      )

      expect(resp.status).toBe(200)
      const body = (await resp.json()) as { message: string }
      expect(body.message).toBe('hello')
    }, 15_000)

    it('proxies POST with body through /-/tunnel/ endpoint', async () => {
      const session = await createFramedSession()
      const publicId = session.public_id
      const token = await signTunnelJWT(publicId)

      const resp = await fetch(
        `${httpBaseUrl}/-/tunnel/echo-body?token=${token}`,
        {
          method: 'POST',
          headers: {
            'X-Tunnel-Public-Id': publicId,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ test: 'data' }),
        },
      )

      expect(resp.status).toBe(200)
      const body = (await resp.json()) as { echo: string }
      expect(body.echo).toBe('{"test":"data"}')
    }, 15_000)
  })
})
