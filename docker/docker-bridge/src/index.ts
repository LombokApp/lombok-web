import { parseBridgeConfig } from './config.js'
import { AdapterPool } from './docker/adapter-pool.js'
import { createHttpServer } from './http-server.js'
import { connectToParent } from './ipc.js'
import { createLogger } from './logger.js'
import { SessionManager } from './sessions/session-manager.js'
import { TunnelSessionHandler } from './sessions/tunnel-session.js'
import { createWsServer } from './ws-server.js'

interface IpcMessage {
  type: string
  id: string
  payload: {
    action: string
    payload: unknown
  }
}

async function main(): Promise<void> {
  const socketPath = process.env.LOMBOK_DOCKER_BRIDGE_SOCKET_PATH
  if (!socketPath) {
    throw new Error(
      'LOMBOK_DOCKER_BRIDGE_SOCKET_PATH environment variable is required',
    )
  }

  const ipc = await connectToParent(socketPath)

  // Wait for init message — parse config but don't respond yet
  const { config, initMsgId } = await new Promise<{
    config: ReturnType<typeof parseBridgeConfig>
    initMsgId: string
  }>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for init message from parent'))
    }, 30000)

    ipc.onMessage((message: unknown) => {
      const msg = message as IpcMessage
      if (msg.type === 'request' && msg.payload.action === 'init') {
        clearTimeout(timeout)
        try {
          const bridgeConfig = parseBridgeConfig(msg.payload.payload)
          resolve({ config: bridgeConfig, initMsgId: msg.id })
        } catch (err) {
          const errMsg = err instanceof Error ? err.message : String(err)
          void ipc
            .send({
              type: 'response',
              id: msg.id,
              payload: {
                action: 'init',
                payload: {
                  success: false,
                  error: { message: errMsg },
                },
              },
            })
            .then(() =>
              reject(err instanceof Error ? err : new Error(String(err))),
            )
            .catch((sendErr: unknown) =>
              reject(
                sendErr instanceof Error ? sendErr : new Error(String(sendErr)),
              ),
            )
        }
      }
    })
  })

  const logger = createLogger({ level: config.logLevel })

  const hostIds = Object.keys(config.dockerHosts)

  logger.info('Starting Docker Bridge', {
    httpPort: config.httpPort,
    wsPort: config.wsPort,
    maxSessions: config.maxSessions,
    maxConcurrentPerSession: config.maxConcurrentPerSession,
    hosts: hostIds,
    logLevel: config.logLevel,
  })

  // Create adapter pool and verify connectivity to all configured hosts
  const adapterPool = new AdapterPool(config.dockerHosts)

  for (const hostId of hostIds) {
    const adapter = adapterPool.get(hostId)
    const up = await adapter.ping()
    if (!up) {
      logger.warn('Docker host is not reachable (will retry on demand)', {
        hostId,
      })
    } else {
      logger.info('Docker host connected', { hostId })
    }
  }

  // Create session manager with sweep
  const sessionManager = new SessionManager({
    maxSessions: config.maxSessions,
    sessionIdleTimeout: config.sessionIdleTimeout,
  })
  sessionManager.startSweep(60_000)

  // Create tunnel handler with backpressure controls
  const tunnelHandler = new TunnelSessionHandler(
    adapterPool,
    sessionManager,
    config,
    logger,
  )

  // Start servers
  const httpServer = createHttpServer(
    config,
    sessionManager,
    tunnelHandler,
    adapterPool,
    logger,
  )

  const wsServer = createWsServer(config, sessionManager, tunnelHandler, logger)

  logger.info('Docker Bridge started', {
    httpPort: httpServer.port,
    wsPort: wsServer.port,
    maxSessions: config.maxSessions,
  })

  // Servers are up — now tell the platform we're ready
  await ipc.send({
    type: 'response',
    id: initMsgId,
    payload: { action: 'init', payload: { success: true } },
  })

  // Graceful shutdown — teardown all sessions before stopping servers
  let shuttingDown = false
  const shutdown = (): void => {
    if (shuttingDown) {
      return
    }
    shuttingDown = true

    logger.info('Shutting down Docker Bridge')
    sessionManager.stopSweep()

    // Teardown all active sessions to kill exec processes and release resources
    const sessions = sessionManager.list()
    void Promise.allSettled(sessions.map((s) => tunnelHandler.teardown(s)))
      .then(() => {
        void httpServer.stop()
        void wsServer.stop()
        process.exit(0)
      })
      .catch(() => {
        void httpServer.stop()
        void wsServer.stop()
        process.exit(1)
      })
  }

  // Handle runtime IPC messages (update_hosts, shutdown)
  ipc.onMessage((message: unknown) => {
    const msg = message as IpcMessage
    if (msg.type !== 'request') {
      return
    }

    const { action, payload } = msg.payload

    if (action === 'update_hosts') {
      try {
        const hosts = payload as Record<string, { type: string; host: string }>
        adapterPool.updateHosts(hosts)
        void ipc.send({
          type: 'response',
          id: msg.id,
          payload: { action: 'update_hosts', payload: { success: true } },
        })
        logger.info('Docker hosts updated', {
          hosts: Object.keys(hosts),
        })
      } catch (err) {
        const errMsg = err instanceof Error ? err.message : String(err)
        void ipc.send({
          type: 'response',
          id: msg.id,
          payload: {
            action: 'update_hosts',
            payload: { success: false, error: { message: errMsg } },
          },
        })
      }
    } else if (action === 'shutdown') {
      void ipc
        .send({
          type: 'response',
          id: msg.id,
          payload: { action: 'shutdown', payload: { success: true } },
        })
        .finally(() => {
          shutdown()
        })
    }
  })

  // Handle parent socket disconnect as shutdown signal
  ipc.socket.on('close', () => {
    logger.info('Parent IPC socket closed, shutting down')
    shutdown()
  })

  process.on('SIGTERM', shutdown)
  process.on('SIGINT', shutdown)
}

main().catch((err: unknown) => {
  const msg = err instanceof Error ? err.message : String(err)
  process.stderr.write(`Fatal error: ${msg}\n`)
  process.exit(1)
})
