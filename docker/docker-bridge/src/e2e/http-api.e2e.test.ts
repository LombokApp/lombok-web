/**
 * E2E tests for the Docker Bridge HTTP API.
 *
 * Spins up a real Bun HTTP server with mock Docker adapters and exercises
 * the full request lifecycle: auth, routing, session management, tunnel
 * traffic, and teardown.
 */
import { EventEmitter } from 'node:events'
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

// --- Response types for typed JSON parsing ---

interface HealthResponse {
  status: string
  hosts: string[]
  sessions: { total: number }
  uptime_seconds: number
}

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

interface ErrorResponse {
  error: string
}

// --- Test infrastructure ---

const API_SECRET = 'e2e-api-secret'
const JWT_SECRET = 'e2e-jwt-secret'

function makeConfig(overrides: Partial<BridgeConfig> = {}): BridgeConfig {
  return {
    httpPort: 0, // let OS assign
    wsPort: 0,
    bridgeApiSecret: API_SECRET,
    bridgeJwtSecret: JWT_SECRET,
    bridgeJwtExpiry: 3600,
    dockerHosts: {
      default: { type: 'docker_endpoint', host: '/var/run/docker.sock' },
    },
    logLevel: 'error', // quiet during tests
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
    error() {},
    debug() {},
  }
}

/** Minimal mock exec stream that acts like a net.Socket */
function createMockExecStream(): net.Socket {
  const emitter = new EventEmitter() as net.Socket & EventEmitter
  const _emitter = emitter as unknown as {
    destroyed: boolean
    write: (data: unknown, cb?: (err?: Error) => void) => boolean
    end: () => void
    destroy: () => void
  }
  _emitter.destroyed = false
  _emitter.write = (_data: unknown, cb?: (err?: Error) => void) => {
    if (cb) {
      cb()
    }
    return true
  }
  _emitter.end = () => {
    _emitter.destroyed = true
  }
  _emitter.destroy = () => {
    _emitter.destroyed = true
  }
  return emitter as unknown as net.Socket
}

function createMockAdapter(): DockerAdapter {
  return {
    async createExec() {
      return 'mock-exec-id'
    },
    async startExec() {
      return createMockExecStream()
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

function createMockAdapterPool(): AdapterPool {
  const adapter = createMockAdapter()
  return {
    get: () => adapter,
    has: () => true,
    hostIds: () => ['default'],
  } as unknown as AdapterPool
}

function authHeaders(secret: string = API_SECRET): Record<string, string> {
  return { Authorization: `Bearer ${secret}` }
}

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

// --- Test suite ---

describe('Bridge HTTP API E2E', () => {
  let server: Server<unknown>
  let baseUrl: string
  let sessionManager: SessionManager
  let config: BridgeConfig

  beforeAll(() => {
    config = makeConfig()
    const logger = makeLogger()
    const adapterPool = createMockAdapterPool()
    sessionManager = new SessionManager({
      maxSessions: config.maxSessions,
      sessionIdleTimeout: config.sessionIdleTimeout,
    })
    const tunnelHandler = new TunnelSessionHandler(
      adapterPool,
      sessionManager,
      config,
      logger,
    )

    server = createHttpServer(
      config,
      sessionManager,
      tunnelHandler,
      adapterPool,
      logger,
    )
    baseUrl = `http://localhost:${server.port}`
  })

  afterAll(() => {
    sessionManager.stopSweep()
    void server.stop()
  })

  // --- Health ---

  describe('GET /health', () => {
    it('returns health status without auth', async () => {
      const res = await fetch(`${baseUrl}/health`)
      expect(res.status).toBe(200)
      const body = (await res.json()) as HealthResponse
      expect(body.status).toBe('ok')
      expect(body.hosts).toBeDefined()
      expect(Array.isArray(body.hosts)).toBe(true)
      expect(body.sessions).toBeDefined()
      expect(body.uptime_seconds).toBeGreaterThanOrEqual(0)
    })
  })

  // --- Auth enforcement ---

  describe('Auth enforcement', () => {
    it('rejects session creation without auth', async () => {
      const res = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'c1',
          command: ['/bin/sh'],
          label: 'test',
          app_id: 'app1',
          public: true,
        }),
      })
      expect(res.status).toBe(401)
    })

    it('rejects session creation with wrong secret', async () => {
      const res = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders('wrong-secret'),
        },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'c1',
          command: ['/bin/sh'],
          label: 'test',
          app_id: 'app1',
          protocol: 'raw',
          public: true,
        }),
      })
      expect(res.status).toBe(401)
    })

    it('rejects session list without auth', async () => {
      const res = await fetch(`${baseUrl}/sessions`)
      expect(res.status).toBe(401)
    })
  })

  // --- CORS ---

  describe('CORS', () => {
    it('returns CORS headers on OPTIONS preflight', async () => {
      const res = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'OPTIONS',
      })
      expect(res.status).toBe(204)
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
      expect(res.headers.get('Access-Control-Allow-Methods')).toContain('POST')
    })

    it('returns CORS headers on regular responses', async () => {
      const res = await fetch(`${baseUrl}/sessions`, {
        headers: authHeaders(),
      })
      expect(res.headers.get('Access-Control-Allow-Origin')).toBe('*')
    })
  })

  // --- Session lifecycle ---

  describe('Session lifecycle', () => {
    it('creates a raw tunnel session', async () => {
      const res = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...authHeaders(),
        },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'container-lifecycle-1',
          command: ['/bin/bash'],
          label: 'terminal',
          app_id: 'coder',
          mode: 'ephemeral',
          protocol: 'raw',
          public: true,
        }),
      })

      expect(res.status).toBe(201)
      const body = (await res.json()) as SessionResponse
      expect(body.id).toMatch(/^sess_/)
      expect(body.container_id).toBe('container-lifecycle-1')
      expect(body.protocol).toBe('raw')
      expect(body.mode).toBe('ephemeral')
      expect(body.state).toBe('created')
      expect(body.public_id).toMatch(/^[a-f0-9]{12}$/)
      expect(body.label).toBe('terminal')
      expect(body.app_id).toBe('coder')
      expect(body.agent_ready).toBe(false)
    })

    it('creates distinct sessions for same params (unique public_ids)', async () => {
      const payload = {
        host_id: 'default',
        container_id: 'container-idempotent',
        command: ['/bin/sh'],
        label: 'test',
        app_id: 'app1',
        protocol: 'raw',
        public: true,
      }
      const res1 = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const body1 = (await res1.json()) as SessionResponse

      const res2 = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify(payload),
      })
      const body2 = (await res2.json()) as SessionResponse

      expect(body1.id).not.toBe(body2.id)
      expect(body1.public_id).not.toBe(body2.public_id)
    })

    it('gets a session by ID', async () => {
      // Create first
      const createRes = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'container-get',
          command: ['/bin/sh'],
          label: 'getme',
          app_id: 'app1',
          protocol: 'raw',
          public: true,
        }),
      })
      const created = (await createRes.json()) as SessionResponse

      // Get
      const getRes = await fetch(`${baseUrl}/sessions/${created.id}`, {
        headers: authHeaders(),
      })
      expect(getRes.status).toBe(200)
      const fetched = (await getRes.json()) as SessionResponse
      expect(fetched.id).toBe(created.id)
      expect(fetched.public_id).toBe(created.public_id)
    })

    it('returns 404 for non-existent session', async () => {
      const res = await fetch(`${baseUrl}/sessions/sess_nonexistent`, {
        headers: authHeaders(),
      })
      expect(res.status).toBe(404)
    })

    it('lists sessions', async () => {
      const res = await fetch(`${baseUrl}/sessions`, {
        headers: authHeaders(),
      })
      expect(res.status).toBe(200)
      const body = (await res.json()) as SessionResponse[]
      expect(Array.isArray(body)).toBe(true)
      expect(body.length).toBeGreaterThan(0)
    })

    it('lists sessions filtered by container_id', async () => {
      const res = await fetch(
        `${baseUrl}/sessions?container_id=container-lifecycle-1`,
        { headers: authHeaders() },
      )
      expect(res.status).toBe(200)
      const body = (await res.json()) as SessionResponse[]
      expect(
        body.every((s) => s.container_id === 'container-lifecycle-1'),
      ).toBe(true)
    })

    it('deletes a session', async () => {
      // Create
      const createRes = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'container-delete',
          command: ['/bin/sh'],
          label: 'deleteme',
          app_id: 'app1',
          protocol: 'raw',
          public: true,
        }),
      })
      const created = (await createRes.json()) as SessionResponse

      // Delete
      const deleteRes = await fetch(`${baseUrl}/sessions/${created.id}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      expect(deleteRes.status).toBe(204)

      // Confirm gone
      const getRes = await fetch(`${baseUrl}/sessions/${created.id}`, {
        headers: authHeaders(),
      })
      expect(getRes.status).toBe(404)
    })
  })

  // --- Input validation ---

  describe('Input validation', () => {
    it('rejects missing host_id', async () => {
      const res = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          container_id: 'c1',
          command: ['/bin/sh'],
          label: 'test',
          app_id: 'app1',
        }),
      })
      expect(res.status).toBe(400)
      const body = (await res.json()) as ErrorResponse
      expect(body.error).toContain('host_id')
    })

    it('rejects missing container_id', async () => {
      const res = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          host_id: 'default',
          command: ['/bin/sh'],
          label: 'test',
          app_id: 'app1',
        }),
      })
      expect(res.status).toBe(400)
      const body = (await res.json()) as ErrorResponse
      expect(body.error).toContain('container_id')
    })

    it('rejects missing command', async () => {
      const res = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'c1',
          label: 'test',
          app_id: 'app1',
        }),
      })
      expect(res.status).toBe(400)
      const body = (await res.json()) as ErrorResponse
      expect(body.error).toContain('command')
    })

    it('rejects empty command array', async () => {
      const res = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'c1',
          command: [],
          label: 'test',
          app_id: 'app1',
        }),
      })
      expect(res.status).toBe(400)
    })

    it('rejects missing label', async () => {
      const res = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'c1',
          command: ['/bin/sh'],
          app_id: 'app1',
        }),
      })
      expect(res.status).toBe(400)
      const body = (await res.json()) as ErrorResponse
      expect(body.error).toContain('label')
    })

    it('rejects missing app_id', async () => {
      const res = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'c1',
          command: ['/bin/sh'],
          label: 'test',
        }),
      })
      expect(res.status).toBe(400)
      const body = (await res.json()) as ErrorResponse
      expect(body.error).toContain('app_id')
    })

    it('defaults mode to persistent and protocol to framed', async () => {
      const res = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'container-defaults',
          command: ['/bin/sh'],
          label: 'test',
          app_id: 'app1',
        }),
      })
      // Framed protocol tries to spawn agent and wait for ready.
      // Mock exec stream never sends ready → 503 after 10s timeout.
      // This proves the default protocol is framed (raw would succeed).
      expect(res.status).toBe(503)
    }, 15_000)
  })

  // --- Tunnel traffic routing ---

  describe('Tunnel traffic', () => {
    it('returns 400 for tunnel path without X-Tunnel-Public-Id', async () => {
      const res = await fetch(`${baseUrl}/-/tunnel/`)
      expect(res.status).toBe(400)
      const body = (await res.json()) as ErrorResponse
      expect(body.error).toBe('missing_headers')
    })

    it('returns 401 for tunnel path without JWT', async () => {
      const res = await fetch(`${baseUrl}/-/tunnel/`, {
        headers: { 'X-Tunnel-Public-Id': 'some-tunnel' },
      })
      expect(res.status).toBe(401)
    })

    it('returns 401 for tunnel path with mismatched public_id', async () => {
      const token = await signTunnelJWT('different-tunnel')
      const res = await fetch(`${baseUrl}/-/tunnel/?token=${token}`, {
        headers: { 'X-Tunnel-Public-Id': 'actual-tunnel' },
      })
      expect(res.status).toBe(401)
    })

    it('returns 502 for tunnel with no active session', async () => {
      const publicId = 'no-session-tunnel'
      const token = await signTunnelJWT(publicId)
      const res = await fetch(`${baseUrl}/-/tunnel/?token=${token}`, {
        headers: { 'X-Tunnel-Public-Id': publicId },
      })
      expect(res.status).toBe(502)
    })

    it('returns 503 for tunnel with session but agent not ready', async () => {
      // Create a raw session with public=true (agent is never "ready" for raw)
      const createRes = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'container-notready',
          command: ['/bin/sh'],
          label: 'test',
          app_id: 'app1',
          protocol: 'raw',
          public: true,
        }),
      })
      expect(createRes.status).toBe(201)
      const created = (await createRes.json()) as SessionResponse
      const publicId = created.public_id

      const token = await signTunnelJWT(publicId)
      const res = await fetch(`${baseUrl}/-/tunnel/?token=${token}`, {
        headers: { 'X-Tunnel-Public-Id': publicId },
      })
      expect(res.status).toBe(503)
    })
  })

  // --- Resize endpoint ---

  describe('POST /sessions/:id/resize', () => {
    it('returns 200 for resize on raw session', async () => {
      const createRes = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'container-resize',
          command: ['/bin/sh'],
          label: 'term',
          app_id: 'app1',
          protocol: 'raw',
          public: true,
        }),
      })
      const session = (await createRes.json()) as SessionResponse

      const res = await fetch(`${baseUrl}/sessions/${session.id}/resize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ cols: 120, rows: 40 }),
      })
      // Should succeed for raw protocol
      expect(res.status).toBe(200)
    })

    it('returns 400 for resize without cols/rows', async () => {
      const createRes = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'container-resize2',
          command: ['/bin/sh'],
          label: 'term',
          app_id: 'app1',
          protocol: 'raw',
          public: true,
        }),
      })
      const session = (await createRes.json()) as SessionResponse

      const res = await fetch(`${baseUrl}/sessions/${session.id}/resize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ cols: 120 }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 400 for resize with negative values', async () => {
      const createRes = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'container-resize-neg',
          command: ['/bin/sh'],
          label: 'term',
          app_id: 'app1',
          protocol: 'raw',
          public: true,
        }),
      })
      const session = (await createRes.json()) as SessionResponse

      const res = await fetch(`${baseUrl}/sessions/${session.id}/resize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ cols: -1, rows: 40 }),
      })
      expect(res.status).toBe(400)
      const body = (await res.json()) as ErrorResponse
      expect(body.error).toContain('positive integers')
    })

    it('returns 400 for resize with float values', async () => {
      const createRes = await fetch(`${baseUrl}/sessions/tunnel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({
          host_id: 'default',
          container_id: 'container-resize-float',
          command: ['/bin/sh'],
          label: 'term',
          app_id: 'app1',
          protocol: 'raw',
          public: true,
        }),
      })
      const session = (await createRes.json()) as SessionResponse

      const res = await fetch(`${baseUrl}/sessions/${session.id}/resize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ cols: 80.5, rows: 24 }),
      })
      expect(res.status).toBe(400)
    })

    it('returns 404 for resize on non-existent session', async () => {
      const res = await fetch(`${baseUrl}/sessions/sess_fake/resize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ cols: 120, rows: 40 }),
      })
      expect(res.status).toBe(404)
    })

    it('returns 401 for resize without auth', async () => {
      const res = await fetch(`${baseUrl}/sessions/sess_any/resize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cols: 120, rows: 40 }),
      })
      expect(res.status).toBe(401)
    })
  })

  // --- Docker container routes ---

  describe('Docker routes', () => {
    it('returns 400 for malformed labels JSON', async () => {
      const res = await fetch(
        `${baseUrl}/docker/default/containers?labels=not-json`,
        { headers: authHeaders() },
      )
      expect(res.status).toBe(400)
      const body = (await res.json()) as ErrorResponse
      expect(body.error).toContain('Invalid labels JSON')
    })
  })

  // --- 404 handling ---

  describe('404', () => {
    it('returns 404 for unknown routes', async () => {
      const res = await fetch(`${baseUrl}/unknown`, {
        headers: authHeaders(),
      })
      expect(res.status).toBe(404)
    })
  })
})
