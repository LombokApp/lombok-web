import type { Server, ServerWebSocket } from 'bun'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HttpServer = Server<any>
import {
  authenticate,
  authenticateSessionToken,
  extractBearerToken,
} from './auth.js'
import type { BridgeConfig } from './config.js'
import type { CreateContainerOptions } from './docker/adapter.js'
import type { AdapterPool } from './docker/adapter-pool.js'
import type { Logger } from './logger.js'
import type { TunnelSession } from './sessions/session.types.js'
import type { SessionManager } from './sessions/session-manager.js'
import type { TunnelSessionHandler } from './sessions/tunnel-session.js'
import type { WSUpgradeMsg } from './tunnel/protocol.types.js'
import {
  handleTunnelTraffic,
  type TunnelWSData,
  type TunnelWSUpgradeRequest,
} from './tunnel/tunnel-traffic.js'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function jsonResponse(
  body: unknown,
  status = 200,
  headers?: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
      ...headers,
    },
  })
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

interface SessionToJSON {
  id: string
  container_id: string
  host_id: string | null
  mode: string
  state: string
  protocol: string
  tty: boolean
  command: string[]
  agent_ready: boolean
  public_id: string | null
  label: string
  app_id: string
  client_count: number
  created_at: number
  last_activity_at: number
}

function sessionToJSON(session: TunnelSession): SessionToJSON {
  return {
    id: session.id,
    container_id: session.containerId,
    host_id: session.hostId,
    mode: session.mode,
    state: session.state,
    protocol: session.protocol,
    tty: session.tty,
    command: session.command,
    agent_ready: session.agentReady,
    public_id: session.publicId,
    label: session.label,
    app_id: session.appId,
    client_count: session.clients.size,
    created_at: session.createdAt,
    last_activity_at: session.lastActivityAt,
  }
}

async function handleRoute(
  method: string,
  path: string,
  url: URL,
  req: Request,
  config: BridgeConfig,
  sessionManager: SessionManager,
  tunnelHandler: TunnelSessionHandler,
  adapterPool: AdapterPool,
  logger: Logger,
  startedAt: number,
): Promise<Response | TunnelWSUpgradeRequest> {
  // CORS preflight
  if (method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: CORS_HEADERS })
  }

  // GET /health — no auth required
  if (method === 'GET' && path === '/health') {
    const allSessions = sessionManager.list()
    return jsonResponse({
      status: 'ok',
      hosts: adapterPool.hostIds(),
      sessions: {
        total: allSessions.length,
      },
      uptime_seconds: Math.floor((Date.now() - startedAt) / 1000),
    })
  }

  // Tunnel traffic from nginx — uses its own JWT auth
  if (path.startsWith('/-/tunnel/')) {
    const result = await handleTunnelTraffic(
      req,
      url,
      config,
      sessionManager,
      tunnelHandler,
      logger,
    )
    if (result) {
      return result
    }
  }

  // Session-scoped JWT auth for resize and delete
  // These routes accept a session-scoped JWT as an alternative to full-scope static tokens
  const resizeMatch = path.match(/^\/sessions\/([^/]+)\/resize$/)
  const sessionIdMatch = path.match(/^\/sessions\/([^/]+)$/)

  if (
    (method === 'POST' && resizeMatch) ||
    (method === 'DELETE' && sessionIdMatch)
  ) {
    const targetSessionId = resizeMatch?.[1] ?? sessionIdMatch?.[1] ?? ''
    let authorized = authenticate(req, config)

    if (!authorized) {
      const token = extractBearerToken(req)
      if (token) {
        const secret = config.bridgeApiSecret
        if (secret) {
          const jwtResult = await authenticateSessionToken(
            token,
            targetSessionId,
            secret,
          )
          authorized = jwtResult.valid
        }
      }
    }

    if (!authorized) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    if (method === 'POST' && resizeMatch) {
      const session = sessionManager.get(targetSessionId)
      if (!session) {
        return jsonResponse({ error: 'Session not found' }, 404)
      }
      if (session.protocol !== 'raw') {
        return jsonResponse(
          { error: 'Resize only supported for raw protocol sessions' },
          400,
        )
      }
      const body = (await req.json()) as { cols?: number; rows?: number }
      if (
        typeof body.cols !== 'number' ||
        typeof body.rows !== 'number' ||
        !Number.isInteger(body.cols) ||
        !Number.isInteger(body.rows) ||
        body.cols < 1 ||
        body.rows < 1
      ) {
        return jsonResponse(
          { error: 'cols and rows must be positive integers' },
          400,
        )
      }
      await tunnelHandler.resize(session, body.cols, body.rows)
      return jsonResponse(sessionToJSON(session))
    }

    if (method === 'DELETE' && sessionIdMatch) {
      const session = sessionManager.get(targetSessionId)
      if (!session) {
        return jsonResponse({ error: 'Session not found' }, 404)
      }
      await tunnelHandler.teardown(session)
      return new Response(null, { status: 204, headers: CORS_HEADERS })
    }
  }

  // All other routes require full-scope static token auth
  if (!authenticate(req, config)) {
    return jsonResponse({ error: 'Unauthorized' }, 401)
  }

  // POST /sessions/tunnel
  if (method === 'POST' && path === '/sessions/tunnel') {
    const body = (await req.json()) as {
      host_id?: string
      container_id?: string
      command?: string[]
      label?: string
      app_id?: string
      mode?: 'ephemeral' | 'persistent'
      protocol?: 'framed' | 'raw'
      tty?: boolean
      public?: boolean
    }

    if (!body.host_id) {
      return jsonResponse({ error: 'host_id is required' }, 400)
    }
    if (!body.container_id) {
      return jsonResponse({ error: 'container_id is required' }, 400)
    }
    if (
      !body.command ||
      !Array.isArray(body.command) ||
      body.command.length === 0
    ) {
      return jsonResponse({ error: 'command array is required' }, 400)
    }
    if (!body.label) {
      return jsonResponse({ error: 'label is required' }, 400)
    }
    if (!body.app_id) {
      return jsonResponse({ error: 'app_id is required' }, 400)
    }

    const mode = body.mode ?? 'persistent'
    const protocol = body.protocol ?? 'framed'

    const tty = body.tty ?? protocol === 'raw'

    const session = await tunnelHandler.create(
      body.host_id,
      body.container_id,
      body.command,
      body.label,
      body.app_id,
      mode,
      protocol,
      tty,
      body.public ?? false,
    )
    return jsonResponse(sessionToJSON(session), 201)
  }

  // GET /sessions
  if (method === 'GET' && path === '/sessions') {
    const containerId = url.searchParams.get('container_id') ?? undefined
    const sessions = sessionManager.list({ containerId })
    return jsonResponse(sessions.map(sessionToJSON))
  }

  // GET /sessions/:id
  {
    const idMatch = path.match(/^\/sessions\/([^/]+)$/)
    if (method === 'GET' && idMatch) {
      const sessionId = idMatch[1]
      const session = sessionManager.get(sessionId)
      if (!session) {
        return jsonResponse({ error: 'Session not found' }, 404)
      }
      return jsonResponse(sessionToJSON(session))
    }
  }

  // ─── Docker routes: /docker/{hostId}/... ─────────────────────────
  const dockerMatch = path.match(/^\/docker\/([^/]+)(?:\/(.*))?$/)
  if (!dockerMatch) {
    return jsonResponse({ error: 'Not found' }, 404)
  }

  const hostId = dockerMatch[1]
  const subpath = dockerMatch[2] || ''
  const adapter = adapterPool.get(hostId)

  // GET /docker/:hostId/test
  if (method === 'GET' && subpath === 'test') {
    const result = await adapter.testConnection()
    return jsonResponse(result)
  }

  // GET /docker/:hostId/resources
  if (method === 'GET' && subpath === 'resources') {
    const resources = await adapter.getHostResources()
    return jsonResponse(resources)
  }

  // POST /docker/:hostId/images/pull
  if (method === 'POST' && subpath === 'images/pull') {
    const body = (await req.json()) as {
      image: string
      registry_auth?: {
        username: string
        password: string
        serveraddress?: string
      }
    }
    if (!body.image) {
      return jsonResponse({ error: 'image is required' }, 400)
    }
    await adapter.pullImage(body.image, { registryAuth: body.registry_auth })
    return jsonResponse({ success: true })
  }

  // GET /docker/:hostId/containers
  if (method === 'GET' && subpath === 'containers') {
    const labelsParam = url.searchParams.get('labels')
    if (labelsParam) {
      let labels: Record<string, string>
      try {
        labels = JSON.parse(labelsParam) as Record<string, string>
      } catch {
        return jsonResponse({ error: 'Invalid labels JSON' }, 400)
      }
      const containers = await adapter.listContainersByLabels(labels)
      return jsonResponse(containers)
    }
    const containers = await adapter.listContainers()
    return jsonResponse(containers)
  }

  // POST /docker/:hostId/containers
  if (method === 'POST' && subpath === 'containers') {
    const body = (await req.json()) as CreateContainerOptions
    if (!body.image) {
      return jsonResponse({ error: 'image is required' }, 400)
    }
    const container = await adapter.createContainer(body)
    return jsonResponse(container, 201)
  }

  // Container sub-routes: /docker/:hostId/containers/:containerId/...
  const containerMatch = subpath.match(/^containers\/([^/]+)(?:\/(.*))?$/)
  if (containerMatch) {
    const containerId = containerMatch[1]
    const action = containerMatch[2] || ''

    if (method === 'GET' && action === 'inspect') {
      return jsonResponse(await adapter.getContainerInspect(containerId))
    }
    if (method === 'GET' && action === 'stats') {
      return jsonResponse(await adapter.getContainerStats(containerId))
    }
    if (method === 'GET' && action === 'logs') {
      const tail = parseInt(url.searchParams.get('tail') ?? '100', 10)
      return jsonResponse(await adapter.getContainerLogs(containerId, { tail }))
    }
    if (method === 'GET' && action === 'running') {
      return jsonResponse({
        running: await adapter.isContainerRunning(containerId),
      })
    }
    if (method === 'POST' && action === 'start') {
      await adapter.startContainer(containerId)
      return jsonResponse({ success: true })
    }
    if (method === 'POST' && action === 'stop') {
      await adapter.stopContainer(containerId)
      return jsonResponse({ success: true })
    }
    if (method === 'POST' && action === 'restart') {
      await adapter.restartContainer(containerId)
      return jsonResponse({ success: true })
    }
    if (method === 'POST' && action === 'remove') {
      const body = (await req.json().catch(() => ({}))) as { force?: boolean }
      await adapter.removeContainer(containerId, { force: body.force })
      return jsonResponse({ success: true })
    }
    if (method === 'POST' && action === 'exec') {
      const body = (await req.json()) as { command?: string[]; env?: string[] }
      if (!body.command || !Array.isArray(body.command)) {
        return jsonResponse({ error: 'command is required' }, 400)
      }
      const result = await adapter.execSync(containerId, body.command, {
        env: body.env,
      })
      return jsonResponse(result)
    }
  }

  return jsonResponse({ error: 'Not found' }, 404)
}

export function createHttpServer(
  config: BridgeConfig,
  sessionManager: SessionManager,
  tunnelHandler: TunnelSessionHandler,
  adapterPool: AdapterPool,
  logger: Logger,
): HttpServer {
  const startedAt = Date.now()
  const server = Bun.serve<TunnelWSData>({
    port: config.httpPort,
    fetch: async (req: Request, srv): Promise<Response | undefined> => {
      const start = performance.now()
      const url = new URL(req.url)
      const method = req.method
      const path = url.pathname

      let status = 200

      try {
        const result = await handleRoute(
          method,
          path,
          url,
          req,
          config,
          sessionManager,
          tunnelHandler,
          adapterPool,
          logger,
          startedAt,
        )

        // Handle WebSocket upgrade for tunnel traffic
        if ('type' in result && result.type === 'ws-upgrade') {
          const upgradeResult = result
          const upgraded = srv.upgrade(req, {
            data: upgradeResult.data,
          })
          if (!upgraded) {
            status = 426
            return jsonResponse({ error: 'WebSocket upgrade failed' }, 426)
          }
          return undefined
        }

        const response = result
        status = response.status
        return response
      } catch (err: unknown) {
        const msg = getErrorMessage(err)
        const errCode = (err as { statusCode?: number }).statusCode
        status = errCode ?? 500
        logger.error('Request error', { method, path, error: msg, status })
        return jsonResponse({ error: msg }, status)
      } finally {
        const duration = Math.round(performance.now() - start)
        logger.info('HTTP request', {
          method,
          path,
          status,
          duration_ms: duration,
        })
      }
    },

    websocket: {
      open(ws: ServerWebSocket<TunnelWSData>) {
        const { publicId, forwardPath, session, streamId } = ws.data
        const tunnelSession = session

        const upgradeMsg: WSUpgradeMsg = {
          type: 'ws_upgrade',
          stream_id: streamId,
          path: forwardPath,
          headers: {},
        }

        tunnelHandler
          .proxyWSUpgrade(tunnelSession, streamId, upgradeMsg, ws)
          .catch((err: unknown) => {
            const msg = err instanceof Error ? err.message : String(err)
            logger.error('Tunnel traffic WS upgrade proxy failed', {
              publicId,
              streamId,
              error: msg,
            })
            ws.close(1011, 'WS upgrade proxy failed')
          })
      },

      message(ws: ServerWebSocket<TunnelWSData>, message: string | Buffer) {
        const { session, streamId } = ws.data
        const data =
          typeof message === 'string'
            ? Buffer.from(message)
            : Buffer.from(message)

        tunnelHandler
          .forwardWSData(session, streamId, data)
          .catch((err: unknown) => {
            logger.error('Tunnel traffic WS data forward failed', {
              streamId,
              error: err instanceof Error ? err.message : String(err),
            })
          })
      },

      close(ws: ServerWebSocket<TunnelWSData>) {
        const { session } = ws.data
        tunnelHandler.detach(session, ws)
      },

      drain() {
        // Backpressure relief
      },
    },
  })

  return server
}
