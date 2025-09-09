import react from '@vitejs/plugin-react-swc'
import http from 'http'
import path from 'path'
import type { PluginOption } from 'vite'
import { defineConfig, loadEnv } from 'vite'

// function createReactPluginsWithWorkerExclusion(
//   workerFileNames: string[] = [],
// ): PluginOption[] {
//   const base = react()
//   const plugins = Array.isArray(base) ? base : [base]

//   const [first, ...rest] = plugins

//   const wrappedFirst: PluginOption = {
//     name: 'react-swc-with-worker-filter',
//     transform(code, id, ..._restArgs) {
//       // Skip React refresh for worker files
//       if (workerFileNames.some((name) => id.includes(name))) {
//         return null
//       }

//       const underlying = first
//       if (underlying && typeof underlying.transform === 'function') {
//         return underlying.transform.call(this, code, id, ..._restArgs)
//       }
//       return null
//     },
//   }

//   return [wrappedFirst, ...rest] as PluginOption[]
// }

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

        const appFrontendProxyHostConfigEnvKey = `LOMBOK_APP_FRONTEND_PROXY_HOST_${appIdentifier.toUpperCase()}`
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
      // ...createReactPluginsWithWorkerExclusion(['worker.ts']),
      react(),
      ...(mode === 'development' ? [subdomainProxyPlugin(env)] : []),
    ] as PluginOption[],
    resolve: {
      alias: {
        '@/src': path.resolve(__dirname, './src'),
        '@/utils': path.resolve(__dirname, '../ui-toolkit/src/utils'),
        '@/components': path.resolve(__dirname, '../ui-toolkit/src/components'),
      },
    },
    server: {
      hmr: {
        overlay: true,
      },
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
