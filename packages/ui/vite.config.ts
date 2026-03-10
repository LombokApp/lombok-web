import http from 'node:http'

import react from '@vitejs/plugin-react-swc'
import path from 'path'
import type { HttpServer, Plugin, PluginOption } from 'vite'
import { defineConfig, loadEnv } from 'vite'

interface WsProxyOptions {
  path: string
  target: string
}

type BunWs = WebSocket & { data: { url: string; backendWs?: WebSocket } }

function createWsHandlers(wsTarget: string) {
  return {
    open(ws: BunWs) {
      const backendWs = new WebSocket(`${wsTarget}${ws.data.url}`)
      backendWs.binaryType = 'arraybuffer'
      backendWs.onmessage = (event: MessageEvent<Buffer>) => ws.send(event.data)
      backendWs.onclose = () => ws.close()
      ws.data.backendWs = backendWs
    },
    message(ws: BunWs, message: string) {
      if (ws.data.backendWs?.readyState === WebSocket.OPEN) {
        ws.data.backendWs.send(message)
      }
    },
    close(ws: BunWs) {
      ws.data.backendWs?.close()
    },
    drain() {
      // no-op: required by Bun's WebSocket handler interface
    },
  }
}

/**
 * Workaround for Bun's Vite dev server not proxying WebSocket upgrades.
 * Intercepts upgrade requests matching `options.path` and manually proxies
 * them through Bun's internal server API.
 */
export function bunWsProxyFix(options: WsProxyOptions): Plugin {
  return {
    name: 'bun-ws-proxy-fix',
    configureServer(server) {
      const targetUrl = new URL(options.target)
      const wsTarget = `ws://${targetUrl.hostname}:${targetUrl.port || '80'}`

      const httpServer = server.httpServer
      if (!httpServer) {
        return
      }

      // Patch missing destroySoon on Bun sockets
      httpServer.on('upgrade', (_req, socket) => {
        if (typeof socket.destroySoon !== 'function') {
          socket.destroySoon =
            (socket as unknown as { destroy?: () => void }).destroy?.bind(
              socket,
            ) ??
            (() => {
              void 0
            })
        }
      })

      httpServer.on('listening', () => {
        const bunServer =
          httpServer[Symbol.for('::bunternal::') as keyof HttpServer]
        if (typeof bunServer !== 'object') {
          return
        }

        const wsHandlers = createWsHandlers(wsTarget)

        try {
          ;(bunServer as unknown as { websocket: unknown }).websocket =
            wsHandlers
        } catch {
          // Bun version may not support direct websocket assignment
        }

        const existingListeners = httpServer.listeners('upgrade')
        httpServer.removeAllListeners('upgrade')

        httpServer.on('upgrade', (req: Request, clientSocket, head) => {
          if (!req.url.startsWith(options.path)) {
            for (const listener of existingListeners) {
              listener.call(httpServer, req, clientSocket, head)
            }
            return
          }

          // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
          const bunResponse =
            clientSocket[
              Symbol.for('::bunternal::') as keyof typeof clientSocket
            ]

          try {
            ;(
              bunServer as unknown as {
                upgrade: (resp: unknown, opts: unknown) => void
              }
            ).upgrade(bunResponse, {
              data: {
                url: req.url,
                headers: req.headers,
                ...wsHandlers,
              },
            })
          } catch {
            // Upgrade failed — connection will be closed by the client
          }
        })
      })
    },
  }
}

// Custom plugin for subdomain routing
function subdomainProxyPlugin(env: Record<string, string>): PluginOption {
  return {
    name: 'subdomain-proxy',
    configureServer: (server) => {
      server.middlewares.use((req, res, next) => {
        const host = req.headers.host
        const url = req.url || ''

        // Only handle if it's an apps subdomain
        if (!host?.match(/\.apps\./)) {
          next()
          return
        }

        // Extract combined subdomain and parse identifiers: <ui>-<app>.apps.<platform_host>
        const hostParts = host.split('.')
        const appIdentifier = hostParts[0]

        if (!appIdentifier) {
          next()
          return
        }

        const appFrontendProxyHostConfigEnvKey = `LOMBOK_APP_FRONTEND_PROXY_HOST_${appIdentifier.split('_')[0]?.toUpperCase()}`
        const appProxyHostConfig = env[appFrontendProxyHostConfigEnvKey]
          ? new URL(env[appFrontendProxyHostConfigEnvKey])
          : undefined

        const defaultProxyHostConfig = env.SC_APP_PROXY_DEFAULT_HOST
          ? new URL(env.SC_APP_PROXY_DEFAULT_HOST)
          : undefined

        // For /worker-api/ paths, always use default proxy host
        const isWorkerApiCall = url.startsWith('/worker-api/')
        const shouldBeReroutedByConfig = appProxyHostConfig && !isWorkerApiCall

        const targetHost = shouldBeReroutedByConfig
          ? appProxyHostConfig.hostname
          : defaultProxyHostConfig?.hostname || 'localhost'
        const targetPort = shouldBeReroutedByConfig
          ? parseInt(appProxyHostConfig.port, 10) || 80
          : parseInt(defaultProxyHostConfig?.port || '3001', 10)

        const requestDetails = {
          hostname: targetHost,
          port: targetPort,
          path: url,
          method: req.method,
          headers: req.headers,
        }
        // Proxy to subdomain server
        const proxyReq = http.request(requestDetails, (proxyRes) => {
          res.writeHead(proxyRes.statusCode || 200, proxyRes.headers)
          proxyRes.pipe(res)
        })

        proxyReq.on('error', (err) => {
          console.error(`Proxy error for ${host}${url}:`, err.message)
          res.statusCode = 502
          res.end('Bad Gateway')
        })

        req.pipe(proxyReq)
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '')

  return {
    plugins: [
      bunWsProxyFix({
        path: '/socket.io',
        target: 'ws://127.0.0.1:3000',
      }),
      // ...createReactPluginsWithWorkerExclusion(['worker.ts']),
      react(),
      ...(mode === 'development' ? [subdomainProxyPlugin(env)] : []),
    ] as PluginOption[],
    resolve: {
      alias: {
        '@/src': path.resolve(__dirname, './src'),
        '@lombokapp/utils': path.resolve(__dirname, '../utils/src'),
        '@lombokapp/types': path.resolve(__dirname, '../types/src'),
        '@lombokapp/sdk': path.resolve(__dirname, '../sdk/src'),
        '@lombokapp/auth-utils': path.resolve(__dirname, '../auth-utils/src'),
      },
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks: {
            'ui-toolkit': ['@lombokapp/ui-toolkit'],
            query: ['@tanstack/react-query', 'openapi-react-query'],
            'lombok-sdk': [
              '@lombokapp/sdk',
              '@lombokapp/types',
              '@lombokapp/auth-utils',
            ],
          },
        },
      },
    },
    preview: {
      proxy: {
        '^/api/': {
          target: process.env.LOMBOK_BACKEND_HOST,
        },
        '^/socket.io/': {
          target: process.env.LOMBOK_BACKEND_HOST,
          ws: true,
        },
      },
    },
    server: {
      hmr: {
        overlay: true,
      },
      proxy: {
        '^/api/': {
          target: 'http://127.0.0.1:3000',
        },
        '^/socket.io/': {
          target: 'ws://127.0.0.1:3000',
        },
      },
    },
  }
})
