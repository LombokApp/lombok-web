import react from '@vitejs/plugin-react-swc'
import http from 'http'
import path from 'path'
import type { PluginOption } from 'vite'
import { defineConfig } from 'vite'

function createReactPluginWithWorkerExclusion(workerFileNames: string[] = []) {
  const [basePlugin] = react()

  return {
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

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    createReactPluginWithWorkerExclusion(['worker.ts']),
    subdomainProxyPlugin(),
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
      '^/api/': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '^/socket.io/': {
        target: 'ws://localhost:3000',
        ws: true,
        changeOrigin: true,
        configure: (proxy, _options) => {
          proxy.on('error', (err, _req, _res) => {
            console.log('Socket.IO proxy error:', {
              err,
              requestHeaders: _req.headers,
              responseHeaders: _res.getHeaders(),
            })
          })
        },
      },
    },
  },
})
