import react from '@vitejs/plugin-react-swc'
import http from 'http'
import path from 'path'
import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'
import { WebSocket } from 'ws'

function createReactPluginWithWorkerExclusion(workerFileNames: string[] = []) {
  const [basePlugin] = react()

  return {
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    ...basePlugin,
    name: 'react-swc-with-worker-filter',
    transform(
      code: string,
      id: string,
      ...rest: ({ ssr?: boolean | undefined } | undefined)[]
    ) {
      if (workerFileNames.some((name) => id.endsWith(name))) {
        return null // Skip transforming this file entirely
      }
      if (
        basePlugin &&
        'transform' in basePlugin &&
        typeof basePlugin.transform === 'function'
      ) {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-explicit-any
        return basePlugin.transform.call(this as any, code, id, ...rest)
      }
      return null
    },
  }
}

// Custom plugin for subdomain routing
function subdomainProxyPlugin(): PluginOption {
  return {
    name: 'subdomain-proxy',
    configureServer: (server) => {
      server.middlewares.use((req, res, next) => {
        const host = req.headers.host
        const url = req.url || ''

        // Only handle if it's an apps subdomain
        if (host?.match(/\.apps\./)) {
          // Proxy to subdomain server
          const proxyReq = http.request(
            {
              hostname: 'localhost',
              port: 3001,
              path: url,
              method: req.method,
              headers: req.headers,
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode || 200, proxyRes.headers)
              proxyRes.pipe(res)
            },
          )

          req.pipe(proxyReq)
          return
        }

        next()
      })
    },
  }
}

// Custom WebSocket proxy plugin
function _socketIoProxyPlugin(): PluginOption {
  return {
    name: 'socketio-proxy',
    configureServer: (server) => {
      // Handle HTTP Socket.IO requests (polling)
      server.middlewares.use((req, res, next) => {
        const url = req.url || ''
        if (
          url.startsWith('/socket.io/') &&
          !url.includes('transport=websocket')
        ) {
          console.log('HTTP Socket.IO request:', url)
          const proxyReq = http.request(
            {
              hostname: 'localhost',
              port: 3000,
              path: url,
              method: req.method,
              headers: req.headers,
            },
            (proxyRes) => {
              res.writeHead(proxyRes.statusCode || 200, proxyRes.headers)
              proxyRes.pipe(res)
            },
          )
          req.pipe(proxyReq)
          return
        }
        next()
      })

      // Handle WebSocket Socket.IO requests
      server.ws.on('connection', (socket, req) => {
        const url = req.url || ''
        if (url.startsWith('/socket.io/')) {
          console.log('WebSocket Socket.IO connection:', url)

          // Create WebSocket connection to backend
          const backendWs = new WebSocket(`ws://localhost:3000${url}`)

          // Forward messages from client to backend
          socket.on('message', (data) => {
            if (backendWs.readyState === WebSocket.OPEN) {
              backendWs.send(data)
            }
          })

          // Forward messages from backend to client
          backendWs.on('message', (data: unknown) => {
            socket.send(data as Buffer)
          })

          // Handle connection close
          socket.on('close', () => {
            backendWs.close()
          })

          backendWs.on('close', () => {
            socket.close()
          })

          // Handle errors
          socket.on('error', (error: unknown) => {
            console.log('Client WebSocket error:', error)
            backendWs.close()
          })

          backendWs.on('error', (error: unknown) => {
            console.log('Backend WebSocket error:', error)
            socket.close()
          })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    createReactPluginWithWorkerExclusion(['worker.ts']),
    subdomainProxyPlugin(),
    _socketIoProxyPlugin(),
  ],
  resolve: {
    alias: {
      '@/src': path.resolve(__dirname, './src'),
      '@/utils': path.resolve(__dirname, '../ui-toolkit/src/utils'),
      '@/components': path.resolve(__dirname, '../ui-toolkit/src/components'),
    },
  },
  server: {
    proxy: {
      '^/api/*': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
})
