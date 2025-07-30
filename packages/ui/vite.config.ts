import react from '@vitejs/plugin-react-swc'
import http from 'http'
import path from 'path'
import type { PluginOption } from 'vite'
import { defineConfig, loadEnv } from 'vite'

function createReactPluginWithWorkerExclusion(
  workerFileNames: string[] = [],
): PluginOption {
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

        // Extract second and third subdomains
        const hostParts = host.split('.')
        const appIdentifier = hostParts[1]
        const uiName = hostParts[0]
        const appProxyHostConfigEnvKey = `SC_APP_PROXY_HOST_${appIdentifier?.toUpperCase()}_${uiName?.toUpperCase()}`
        const appProxyHostConfig = env[appProxyHostConfigEnvKey]
          ? new URL(env[appProxyHostConfigEnvKey])
          : undefined

        const targetHost =
          appIdentifier && uiName && appProxyHostConfig
            ? appProxyHostConfig.hostname
            : 'localhost'
        const targetPort =
          appIdentifier && uiName && appProxyHostConfig
            ? parseInt(appProxyHostConfig.port, 10) || 80
            : 3001

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
    plugins: [createReactPluginWithWorkerExclusion(['worker.ts'])].concat(
      mode === 'development' ? [subdomainProxyPlugin(env)] : [],
    ),
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
        },
        '^/socket.io/': {
          target: 'ws://localhost:3000',
          ws: true,
        },
      },
    },
  }
})
