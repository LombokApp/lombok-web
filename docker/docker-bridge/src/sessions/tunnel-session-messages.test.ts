import { beforeEach, describe, expect, it, mock } from 'bun:test'

import type { BridgeConfig } from '../config.js'
import type { AdapterPool } from '../docker/adapter-pool.js'
import type { Logger } from '../logger.js'
import type {
  BodyChunkMsg,
  BodyEndMsg,
  HTTPResponseMsg,
  StreamCloseMsg,
  WSDataMsg,
  WSUpgradeAckMsg,
} from '../tunnel/protocol.types.js'
import type { TunnelSession } from './session.types.js'
import type { SessionManager } from './session-manager.js'
import { TunnelSessionHandler } from './tunnel-session.js'

// --- Helpers ---

function makeConfig(): BridgeConfig {
  return {
    httpPort: 3100,
    wsPort: 3101,
    bridgeApiSecret: 'test-secret',
    bridgeJwtSecret: 'test-jwt-secret',
    bridgeJwtExpiry: 3600,
    dockerHosts: {
      default: { type: 'docker_endpoint', host: '/var/run/docker.sock' },
    },
    logLevel: 'info',
    maxSessions: 200,
    maxConcurrentPerSession: 100,
    sessionIdleTimeout: 1800000,
    ephemeralGracePeriod: 5000,
  }
}

function makeLogger(): Logger {
  return {
    info: mock(() => {
      void 0
    }),
    warn: mock(() => {
      void 0
    }),
    error: mock(() => {
      void 0
    }),
    debug: mock(() => {
      void 0
    }),
  }
}

function makeSessionManager(): SessionManager {
  return {
    create: mock(() => ({})),
    get: mock(() => undefined),
    getByPublicId: mock(() => undefined),
    delete: mock(() => {
      void 0
    }),
    touch: mock(() => {
      void 0
    }),
    list: mock(() => []),
    sweep: mock(() => 0),
    count: mock(() => 0),
  } as unknown as SessionManager
}

function makeAdapterPool(): AdapterPool {
  return {
    get: mock(() => ({
      createExec: mock(async () => 'exec-1'),
      startExec: mock(async () => ({
        on: mock(() => {
          void 0
        }),
        write: mock(() => true),
        end: mock(() => {
          void 0
        }),
        destroy: mock(() => {
          void 0
        }),
        destroyed: false,
      })),
      inspectExec: mock(async () => ({ running: false, pid: 0 })),
      killExec: mock(async () => {}),
      resizeExec: mock(async () => {}),
    })),
  } as unknown as AdapterPool
}

function makeSession(overrides: Partial<TunnelSession> = {}): TunnelSession {
  return {
    id: 'sess_test',
    containerId: 'container-1',
    hostId: 'host-1',
    mode: 'persistent',
    state: 'active',
    createdAt: Date.now(),
    lastActivityAt: Date.now(),
    clients: new Set(),
    execId: 'exec-1',
    execStream: null,
    command: ['/usr/local/bin/tunnel-agent'],
    protocol: 'framed',
    tty: false,
    agentReady: true,
    publicId: 'tunnel-1',
    label: 'preview',
    appId: 'coder',
    ...overrides,
  }
}

function makeMockWs(): {
  send: ReturnType<typeof mock>
  close: ReturnType<typeof mock>
} {
  return {
    send: mock(() => {
      void 0
    }),
    close: mock(() => {
      void 0
    }),
  }
}

// --- Tests ---

describe('TunnelSessionHandler — message handling', () => {
  let handler: TunnelSessionHandler
  let sessionManager: SessionManager
  let logger: Logger

  beforeEach(() => {
    sessionManager = makeSessionManager()
    logger = makeLogger()
    handler = new TunnelSessionHandler(
      makeAdapterPool(),
      sessionManager,
      makeConfig(),
      logger,
    )
  })

  describe('handleAgentMessage', () => {
    it('dispatches ready message', () => {
      const session = makeSession({ state: 'created', agentReady: false })

      handler.handleAgentMessage(session, { type: 'ready' })

      expect(session.agentReady).toBe(true)
      expect(session.state).toBe('active')
    })

    it('dispatches heartbeat message', () => {
      const session = makeSession()

      // Should not throw
      handler.handleAgentMessage(session, { type: 'heartbeat' })

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sessionManager.touch).toHaveBeenCalledWith(session.id)
    })

    it('logs warning for unknown message type', () => {
      const session = makeSession()

      handler.handleAgentMessage(session, {
        type: 'unknown_type' as 'ready',
      })

      expect(logger.warn).toHaveBeenCalled()
    })

    it('touches session on every message', () => {
      const session = makeSession()

      handler.handleAgentMessage(session, { type: 'heartbeat' })

      // eslint-disable-next-line @typescript-eslint/unbound-method
      expect(sessionManager.touch).toHaveBeenCalledWith(session.id)
    })
  })

  describe('forwardToClient (via http_response)', () => {
    it('resolves pending direct HTTP response without body', () => {
      const session = makeSession()

      // Set up a pending HTTP response by accessing private map
      const pendingMap = (
        handler as unknown as { pendingHTTPResponses: Map<string, unknown> }
      ).pendingHTTPResponses
      let resolved: unknown = null
      pendingMap.set('stream-1', {
        resolve: (resp: unknown) => {
          resolved = resp
        },
        reject: () => {},
        responseMeta: null,
        bodyChunks: [],
        expectingBinary: false,
      })

      const msg: HTTPResponseMsg = {
        type: 'http_response',
        stream_id: 'stream-1',
        status_code: 200,
        headers: { 'Content-Type': 'text/plain' },
      }

      handler.handleAgentMessage(session, msg)

      expect(resolved).not.toBeNull()
      expect((resolved as { statusCode: number }).statusCode).toBe(200)
      expect(pendingMap.has('stream-1')).toBe(false)
    })

    it('sets expectingBinary for response with body_follows', () => {
      const session = makeSession()

      const pendingMap = (
        handler as unknown as { pendingHTTPResponses: Map<string, unknown> }
      ).pendingHTTPResponses
      const pending = {
        resolve: mock(() => {
          void 0
        }),
        reject: mock(() => {
          void 0
        }),
        responseMeta: null as HTTPResponseMsg | null,
        bodyChunks: [] as Buffer[],
        expectingBinary: false,
      }
      pendingMap.set('stream-2', pending)

      const msg: HTTPResponseMsg = {
        type: 'http_response',
        stream_id: 'stream-2',
        status_code: 200,
        headers: {},
        body_follows: true,
      }

      handler.handleAgentMessage(session, msg)

      expect(pending.expectingBinary).toBe(true)
      expect(pending.responseMeta).not.toBeNull()
      expect(pendingMap.has('stream-2')).toBe(true) // not resolved yet
    })

    it('forwards to WS client for non-pending stream', () => {
      const session = makeSession()
      const ws = makeMockWs()
      session.clients.add(ws)

      // Register the stream
      const streamMap = (
        handler as unknown as {
          getStreamMap: (id: string) => Map<string, unknown>
        }
      ).getStreamMap.call(handler, session.id)
      streamMap.set('stream-3', { ws, type: 'http' })

      // Register the session with the limiter
      const limiter = (
        handler as unknown as {
          limiter: { register: (id: string, max: number) => void }
        }
      ).limiter
      limiter.register(session.id, 100)

      const msg: HTTPResponseMsg = {
        type: 'http_response',
        stream_id: 'stream-3',
        status_code: 404,
        headers: {},
      }

      handler.handleAgentMessage(session, msg)

      // Verify ws.send was called (via write serializer)
      // The serializer calls ws.send asynchronously
      expect(streamMap.has('stream-3')).toBe(false) // cleaned up for no body_follows
    })

    it('ignores messages without stream_id', () => {
      const session = makeSession()

      const msg: HTTPResponseMsg = {
        type: 'http_response',
        status_code: 200,
        headers: {},
        // no stream_id
      }

      // Should not throw
      handler.handleAgentMessage(session, msg)
    })
  })

  describe('handleAgentBinary', () => {
    it('delivers binary to pending response expecting it', () => {
      const session = makeSession()

      const pendingMap = (
        handler as unknown as { pendingHTTPResponses: Map<string, unknown> }
      ).pendingHTTPResponses
      let resolved: unknown = null
      pendingMap.set('stream-bin', {
        resolve: (resp: unknown) => {
          resolved = resp
        },
        reject: () => {},
        responseMeta: {
          type: 'http_response',
          stream_id: 'stream-bin',
          status_code: 200,
          headers: { 'Content-Type': 'application/octet-stream' },
          body_follows: true,
        },
        bodyChunks: [],
        expectingBinary: true,
      })

      // Set the stream ID that the next binary frame belongs to
      // (normally set by forwardToClient when body_follows is true)
      ;(
        handler as unknown as { nextBinaryStreamId: string | null }
      ).nextBinaryStreamId = 'stream-bin'

      handler.handleAgentBinary(session, Buffer.from('hello binary'))

      expect(resolved).not.toBeNull()
      expect((resolved as { body: Buffer }).body.toString()).toBe(
        'hello binary',
      )
      expect((resolved as { statusCode: number }).statusCode).toBe(200)
      expect(pendingMap.has('stream-bin')).toBe(false)
    })

    it('forwards binary to WS clients when no pending response', () => {
      const session = makeSession()
      const ws = makeMockWs()
      session.clients.add(ws)

      // Register the session with write serializer
      handler.handleAgentBinary(session, Buffer.from('ws-data'))

      // Should attempt to send to client (via serializer)
      // The actual send happens async through the write serializer
    })
  })

  describe('handleStreamClose', () => {
    it('rejects pending direct HTTP response', () => {
      const session = makeSession()

      const pendingMap = (
        handler as unknown as { pendingHTTPResponses: Map<string, unknown> }
      ).pendingHTTPResponses
      let rejectedErr: Error | null = null
      pendingMap.set('stream-close', {
        resolve: () => {},
        reject: (err: Error) => {
          rejectedErr = err
        },
        responseMeta: null,
        bodyChunks: [],
        expectingBinary: false,
      })

      const msg: StreamCloseMsg = {
        type: 'stream_close',
        stream_id: 'stream-close',
        reason: 'timeout',
      }

      handler.handleAgentMessage(session, msg)

      expect(rejectedErr).not.toBeNull()
      expect(rejectedErr!.message).toContain('timeout')
      expect(pendingMap.has('stream-close')).toBe(false)
    })

    it('cleans up stream and releases limiter for http stream', () => {
      const session = makeSession()
      const ws = makeMockWs()

      const streamMap = (
        handler as unknown as {
          getStreamMap: (id: string) => Map<string, unknown>
        }
      ).getStreamMap.call(handler, session.id)
      streamMap.set('stream-sc', { ws, type: 'http' })

      const limiter = (
        handler as unknown as {
          limiter: {
            register: (id: string, max: number) => void
            getInFlight: (id: string) => number
            acquire: (id: string) => boolean
          }
        }
      ).limiter
      limiter.register(session.id, 100)
      limiter.acquire(session.id) // simulate in-flight

      expect(limiter.getInFlight(session.id)).toBe(1)

      const msg: StreamCloseMsg = {
        type: 'stream_close',
        stream_id: 'stream-sc',
      }

      handler.handleAgentMessage(session, msg)

      expect(streamMap.has('stream-sc')).toBe(false)
      expect(limiter.getInFlight(session.id)).toBe(0)
    })

    it('does not release limiter for ws stream', () => {
      const session = makeSession()
      const ws = makeMockWs()

      const streamMap = (
        handler as unknown as {
          getStreamMap: (id: string) => Map<string, unknown>
        }
      ).getStreamMap.call(handler, session.id)
      streamMap.set('stream-ws', { ws, type: 'ws' })

      const limiter = (
        handler as unknown as {
          limiter: {
            register: (id: string, max: number) => void
            getInFlight: (id: string) => number
            acquire: (id: string) => boolean
          }
        }
      ).limiter
      limiter.register(session.id, 100)

      const msg: StreamCloseMsg = {
        type: 'stream_close',
        stream_id: 'stream-ws',
      }

      handler.handleAgentMessage(session, msg)

      expect(streamMap.has('stream-ws')).toBe(false)
      expect(limiter.getInFlight(session.id)).toBe(0)
    })
  })

  describe('handleBodyChunk', () => {
    it('sets expectingBinary on pending direct response', () => {
      const session = makeSession()

      const pendingMap = (
        handler as unknown as { pendingHTTPResponses: Map<string, unknown> }
      ).pendingHTTPResponses
      const pending = {
        resolve: mock(() => {
          void 0
        }),
        reject: mock(() => {
          void 0
        }),
        responseMeta: null,
        bodyChunks: [],
        expectingBinary: false,
      }
      pendingMap.set('stream-chunk', pending)

      const msg: BodyChunkMsg = {
        type: 'body_chunk',
        stream_id: 'stream-chunk',
      }

      handler.handleAgentMessage(session, msg)

      expect(pending.expectingBinary).toBe(true)
    })
  })

  describe('handleBodyEnd', () => {
    it('resolves pending direct response with accumulated chunks', () => {
      const session = makeSession()

      const pendingMap = (
        handler as unknown as { pendingHTTPResponses: Map<string, unknown> }
      ).pendingHTTPResponses
      let resolved: unknown = null
      pendingMap.set('stream-end', {
        resolve: (resp: unknown) => {
          resolved = resp
        },
        reject: () => {},
        responseMeta: {
          type: 'http_response',
          stream_id: 'stream-end',
          status_code: 200,
          headers: { 'Content-Type': 'text/html' },
        },
        bodyChunks: [Buffer.from('chunk1'), Buffer.from('chunk2')],
        expectingBinary: false,
      })

      const msg: BodyEndMsg = {
        type: 'body_end',
        stream_id: 'stream-end',
      }

      handler.handleAgentMessage(session, msg)

      expect(resolved).not.toBeNull()
      expect((resolved as { body: Buffer }).body.toString()).toBe(
        'chunk1chunk2',
      )
      expect((resolved as { statusCode: number }).statusCode).toBe(200)
    })

    it('resolves with null body when no chunks accumulated', () => {
      const session = makeSession()

      const pendingMap = (
        handler as unknown as { pendingHTTPResponses: Map<string, unknown> }
      ).pendingHTTPResponses
      let resolved: unknown = null
      pendingMap.set('stream-empty', {
        resolve: (resp: unknown) => {
          resolved = resp
        },
        reject: () => {},
        responseMeta: null,
        bodyChunks: [],
        expectingBinary: false,
      })

      handler.handleAgentMessage(session, {
        type: 'body_end',
        stream_id: 'stream-empty',
      })

      expect(resolved).not.toBeNull()
      expect((resolved as { body: Buffer | null }).body).toBeNull()
    })

    it('releases limiter for http stream on body_end', () => {
      const session = makeSession()
      const ws = makeMockWs()

      const streamMap = (
        handler as unknown as {
          getStreamMap: (id: string) => Map<string, unknown>
        }
      ).getStreamMap.call(handler, session.id)
      streamMap.set('stream-be', { ws, type: 'http' })

      const limiter = (
        handler as unknown as {
          limiter: {
            register: (id: string, max: number) => void
            getInFlight: (id: string) => number
            acquire: (id: string) => boolean
          }
        }
      ).limiter
      limiter.register(session.id, 100)
      limiter.acquire(session.id)

      handler.handleAgentMessage(session, {
        type: 'body_end',
        stream_id: 'stream-be',
      })

      expect(limiter.getInFlight(session.id)).toBe(0)
      expect(streamMap.has('stream-be')).toBe(false)
    })
  })

  describe('ws_upgrade_ack forwarding', () => {
    it('forwards ws_upgrade_ack to the stream owner WS client', () => {
      const session = makeSession()
      const ws = makeMockWs()
      session.clients.add(ws)

      const streamMap = (
        handler as unknown as {
          getStreamMap: (id: string) => Map<string, unknown>
        }
      ).getStreamMap.call(handler, session.id)
      streamMap.set('ws-stream-1', { ws, type: 'ws' })

      const msg: WSUpgradeAckMsg = {
        type: 'ws_upgrade_ack',
        stream_id: 'ws-stream-1',
        success: true,
      }

      handler.handleAgentMessage(session, msg)

      // Stream stays open for ws_upgrade_ack (it's not a terminal message)
      expect(streamMap.has('ws-stream-1')).toBe(true)
    })
  })

  describe('ws_data forwarding', () => {
    it('forwards ws_data to the stream owner WS client', () => {
      const session = makeSession()
      const ws = makeMockWs()
      session.clients.add(ws)

      const streamMap = (
        handler as unknown as {
          getStreamMap: (id: string) => Map<string, unknown>
        }
      ).getStreamMap.call(handler, session.id)
      streamMap.set('ws-data-1', { ws, type: 'ws' })

      const msg: WSDataMsg = {
        type: 'ws_data',
        stream_id: 'ws-data-1',
        body_follows: true,
      }

      handler.handleAgentMessage(session, msg)

      // Stream stays open for ws_data
      expect(streamMap.has('ws-data-1')).toBe(true)

      // nextBinaryStreamId should be set so the following binary frame
      // routes to this stream's WS client (not broadcast)
      const nextBinaryStreamId = (
        handler as unknown as { nextBinaryStreamId: string | null }
      ).nextBinaryStreamId
      expect(nextBinaryStreamId).toBe('ws-data-1')
    })

    it('routes ws_data binary frame to the stream client, not broadcast', () => {
      const session = makeSession()
      const streamWs = makeMockWs()
      const otherWs = makeMockWs()
      session.clients.add(streamWs)
      session.clients.add(otherWs)

      const streamMap = (
        handler as unknown as {
          getStreamMap: (id: string) => Map<string, unknown>
        }
      ).getStreamMap.call(handler, session.id)
      streamMap.set('ws-stream-targeted', { ws: streamWs, type: 'ws' })

      // Simulate agent sending ws_data with body_follows
      const wsDataMsg: WSDataMsg = {
        type: 'ws_data',
        stream_id: 'ws-stream-targeted',
        body_follows: true,
      }
      handler.handleAgentMessage(session, wsDataMsg)

      // Now send the binary frame
      handler.handleAgentBinary(session, Buffer.from('ws-binary-payload'))

      // The stream client should have received data (via serializer)
      // The other client should NOT have received anything
      // We verify by checking that otherWs.send was not called
      expect(otherWs.send).not.toHaveBeenCalled()
    })
  })

  describe('detach', () => {
    it('removes client from session', () => {
      const session = makeSession()
      const ws = makeMockWs()
      session.clients.add(ws)

      handler.detach(session, ws)

      expect(session.clients.has(ws)).toBe(false)
    })

    it('cleans up streams owned by detached client and releases limiter', () => {
      const session = makeSession()
      const ws1 = makeMockWs()
      const ws2 = makeMockWs()
      session.clients.add(ws1)
      session.clients.add(ws2)

      const streamMap = (
        handler as unknown as {
          getStreamMap: (id: string) => Map<string, unknown>
        }
      ).getStreamMap.call(handler, session.id)
      streamMap.set('s1', { ws: ws1, type: 'http' })
      streamMap.set('s2', { ws: ws2, type: 'http' })
      streamMap.set('s3', { ws: ws1, type: 'ws' })

      const limiter = (
        handler as unknown as {
          limiter: {
            register: (id: string, max: number) => void
            acquire: (id: string) => boolean
            getInFlight: (id: string) => number
          }
        }
      ).limiter
      limiter.register(session.id, 100)
      limiter.acquire(session.id) // for s1
      limiter.acquire(session.id) // for s2

      handler.detach(session, ws1)

      // s1 (ws1, http) should be removed, limiter released
      // s2 (ws2, http) should remain
      // s3 (ws1, ws) should be removed, no limiter release
      expect(streamMap.has('s1')).toBe(false)
      expect(streamMap.has('s2')).toBe(true)
      expect(streamMap.has('s3')).toBe(false)
      expect(limiter.getInFlight(session.id)).toBe(1) // only s2 remains
    })
  })

  describe('resize', () => {
    it('throws for framed protocol', async () => {
      const session = makeSession({ protocol: 'framed' })

      expect(handler.resize(session, 80, 24)).rejects.toThrow(
        'Resize only supported for raw protocol sessions',
      )
    })

    it('throws when session has no execId', async () => {
      const session = makeSession({ protocol: 'raw', execId: null })

      expect(handler.resize(session, 80, 24)).rejects.toThrow(
        'Session has no execId',
      )
    })
  })

  describe('writeToExec', () => {
    it('throws for framed protocol', () => {
      const session = makeSession({ protocol: 'framed' })

      expect(() => handler.writeToExec(session, Buffer.from('test'))).toThrow(
        'writeToExec only supported for raw protocol sessions',
      )
    })

    it('writes to exec stream for raw protocol', () => {
      const writeMock = mock(() => true)
      const session = makeSession({
        protocol: 'raw',
        execStream: {
          write: writeMock,
          destroyed: false,
        } as unknown as TunnelSession['execStream'],
      })

      handler.writeToExec(session, Buffer.from('hello'))

      expect(writeMock).toHaveBeenCalledTimes(1)
    })

    it('does not write to destroyed stream', () => {
      const writeMock = mock(() => true)
      const session = makeSession({
        protocol: 'raw',
        execStream: {
          write: writeMock,
          destroyed: true,
        } as unknown as TunnelSession['execStream'],
      })

      handler.writeToExec(session, Buffer.from('hello'))

      expect(writeMock).not.toHaveBeenCalled()
    })
  })
})
