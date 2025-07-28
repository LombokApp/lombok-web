import {
  analyzeObjectTaskHandler,
  connectAndPerformWork,
  runWorkerScriptHandler,
} from '@stellariscloud/core-worker'
import { z } from 'zod'

const WorkerDataPayloadRunType = z.object({
  appWorkerId: z.string(),
  appToken: z.string(),
  socketBaseUrl: z.string(),
})

type WorkerDataPayload = z.infer<typeof WorkerDataPayloadRunType>

let initialized = false
let server: ReturnType<typeof Bun.serve> | null = null

// Cleanup function to properly close the server
const cleanup = () => {
  if (server) {
    console.log('Shutting down HTTP server...')
    void server.stop()
    server = null
  }
}

// Handle process termination signals
process.on('SIGTERM', cleanup)
process.on('SIGINT', cleanup)
process.on('exit', cleanup)

process.stdin.once('data', (data) => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  const workerData: WorkerDataPayload = JSON.parse(data.toString())
  if (!initialized && WorkerDataPayloadRunType.safeParse(workerData).success) {
    initialized = true
    const { wait, log, socket } = connectAndPerformWork(
      workerData.socketBaseUrl,
      workerData.appWorkerId,
      workerData.appToken,
      {
        ['ANALYZE_OBJECT']: analyzeObjectTaskHandler,
        ['RUN_WORKER_SCRIPT']: runWorkerScriptHandler,
      },
    )

    log({
      message: 'Core app worker thread started...',
      name: 'CoreAppWorkerStartup',
      data: {
        workerData,
      },
    })

    void wait
      .then(() => {
        ;(socket.disconnected ? console.log : log)({
          message: 'Done work.',
          level: 'info',
        })
      })
      .catch((e: unknown) => {
        ;(socket.disconnected ? console.log : log)({
          level: 'error',
          message: e instanceof Error ? e.message : '',
        })
        if (
          e &&
          typeof e === 'object' &&
          'name' in e &&
          'message' in e &&
          'stacktrace' in e
        ) {
          ;(socket.disconnected ? console.log : log)({
            message: 'Core app worker thread error.',
            level: 'error',
            name: 'CoreAppWorkerError',
            data: {
              name: e.name,
              message: e.message,
              stacktrace: e.stacktrace,
              appWorkerId: workerData.appWorkerId,
            },
          })
        }
        throw e
      })
      .finally(() => {
        console.log({ level: 'info', message: 'Shutting down.' })
        cleanup()
      })

    // start a http server on port 3002
    server = Bun.serve({
      port: 3002,

      routes: {
        '/health': () => {
          return new Response(
            JSON.stringify({
              status: 'ok',
              timestamp: new Date().toISOString(),
              workerId: workerData.appWorkerId,
              message: 'Core app worker is running',
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            },
          )
        },

        '/api/info': () => {
          return new Response(
            JSON.stringify({
              name: 'Core App Worker',
              version: '1.0.0',
              endpoints: [
                '/health - Health check endpoint',
                '/api/info - API information',
                '/logo - Logo image',
              ],
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            },
          )
        },

        '/assets/logo.png': () => {
          const logoPath = new URL(
            '../../../../apps/dev/ui/main/assets/logo.png',
            import.meta.url,
          )
          const logoFile = Bun.file(logoPath)
          return new Response(logoFile, {
            headers: { 'Content-Type': 'image/png' },
          })
        },

        '/': (req: Request) => {
          // Parse the host header to extract app identifier and UI name
          const host = req.headers.get('host') || ''
          const xAppSubdomain = req.headers.get('x-app-subdomain') || ''

          // Parse host like "main.dev.apps.example.com"
          // Extract UI name (first part) and app identifier (second part)
          const hostParts = host.split('.')
          const uiName = hostParts[0] || 'unknown'
          const appIdentifier = hostParts[1] || 'unknown'

          // Use the X-App-Subdomain header if available, otherwise use parsed host
          const finalUiName = xAppSubdomain || uiName

          const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Stellaris Cloud App Worker - ${finalUiName}.${appIdentifier}</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 40px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            min-height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
        }
        .container {
            text-align: center;
            max-width: 600px;
            background: rgba(255, 255, 255, 0.1);
            padding: 40px;
            border-radius: 20px;
            backdrop-filter: blur(10px);
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
        }
        h1 {
            font-size: 2.5rem;
            margin-bottom: 20px;
            font-weight: 700;
        }
        p {
            font-size: 1.2rem;
            margin-bottom: 30px;
            opacity: 0.9;
        }
        .status {
            display: inline-block;
            background: rgba(76, 175, 80, 0.2);
            color: #4CAF50;
            padding: 10px 20px;
            border-radius: 25px;
            font-weight: 600;
            border: 2px solid rgba(76, 175, 80, 0.3);
        }
        .app-info {
            margin: 20px 0;
            padding: 20px;
            background: rgba(255, 255, 255, 0.05);
            border-radius: 10px;
            border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .app-info h3 {
            margin-top: 0;
            margin-bottom: 15px;
            color: #FFD700;
        }
        .app-info .info-row {
            display: flex;
            justify-content: space-between;
            margin: 10px 0;
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .app-info .info-row:last-child {
            border-bottom: none;
        }
        .app-info .label {
            font-weight: 600;
            color: #FFD700;
        }
        .app-info .value {
            font-family: 'Courier New', monospace;
            background: rgba(255, 255, 255, 0.1);
            padding: 4px 8px;
            border-radius: 4px;
        }
        .endpoints {
            margin-top: 30px;
            text-align: left;
            background: rgba(255, 255, 255, 0.05);
            padding: 20px;
            border-radius: 10px;
        }
        .endpoints h3 {
            margin-top: 0;
            margin-bottom: 15px;
        }
        .endpoints ul {
            list-style: none;
            padding: 0;
        }
        .endpoints li {
            padding: 8px 0;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .endpoints li:last-child {
            border-bottom: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Stellaris Cloud</h1>
        <p>Core App Worker is running successfully!</p>
        <div class="status">✅ Active</div>
        
        <div class="app-info">
            <h3>📋 App Information</h3>
            <div class="info-row">
                <span class="label">UI Name:</span>
                <span class="value">${finalUiName}</span>
            </div>
            <div class="info-row">
                <span class="label">App Identifier:</span>
                <span class="value">${appIdentifier}</span>
            </div>
            <div class="info-row">
                <span class="label">Full Host:</span>
                <span class="value">${host}</span>
            </div>
        </div>
        
        <div class="endpoints">
            <h3>Available Endpoints:</h3>
            <ul>
                <li><strong>/health</strong> - Health check endpoint</li>
                <li><strong>/api/info</strong> - API information</li>
                <li><strong>/apps/assets/logo.png</strong> - Logo image</li>
            </ul>
        </div>
    </div>
</body>
</html>`

          return new Response(html, {
            headers: { 'Content-Type': 'text/html' },
          })
        },
      },

      // Fallback for unmatched routes
      fetch(_req) {
        return new Response('Not Found', { status: 404 })
      },
    })

    console.log(`HTTP server started on port ${server.port}`)
  }
})
