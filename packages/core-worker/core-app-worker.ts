import { buildAppClient } from '@lombokapp/app-worker-sdk'
import { uniqueExecutionKey } from '@lombokapp/core-worker-utils'
import type { AppManifest } from '@lombokapp/types'
import { spawn } from 'bun'
import fs from 'fs'
import os from 'os'
import path from 'path'

import { connectAndPerformWork } from './src/connect-app-worker'
import { analyzeObjectTaskHandler } from './src/handlers/analyze-object-task-handler'
import { bulidRunWorkerScriptTaskHandler } from './src/handlers/run-worker-script/run-worker-script-handler'
import {
  runWorkerScript,
  shutdownAllWorkerSandboxes,
} from './src/worker-scripts/run-worker-script'
import type { CoreWorkerProcessDataPayload } from './src/worker-scripts/worker-daemon/types'
import { coreWorkerProcessDataPayloadSchema } from './src/worker-scripts/worker-daemon/types'

let initialized = false
let server: ReturnType<typeof Bun.serve> | null = null

const cleanup = () => {
  if (server) {
    void server.stop()
    server = null
  }
  // Ensure all nsjail sandboxes started by this process are stopped
  void shutdownAllWorkerSandboxes().catch(() => undefined)
}

process.on('SIGTERM', cleanup)
process.on('SIGINT', cleanup)
process.on('exit', cleanup)

process.stdin.on('close', () => {
  cleanup()
  process.exit(0)
})

process.stdin.once('data', (data) => {
  const workerData: CoreWorkerProcessDataPayload = JSON.parse(
    data.toString(),
  ) as CoreWorkerProcessDataPayload

  if (
    !initialized &&
    coreWorkerProcessDataPayloadSchema.safeParse(workerData).success
  ) {
    initialized = true
    const { wait, log, socket } = connectAndPerformWork(
      workerData.socketBaseUrl,
      workerData.appWorkerId,
      workerData.appToken,
      {
        ['analyze_object']: analyzeObjectTaskHandler,
        ['run_worker_script']: bulidRunWorkerScriptTaskHandler(
          workerData.executionOptions,
        ),
      },
      async () => {
        await log({
          message: 'Core app external worker thread started',
          level: 'DEBUG',
          data: {
            workerData: {
              socketBaseUrl: workerData.socketBaseUrl,
              host: workerData.platformHost,
              executionOptions: workerData.executionOptions,
              appWorkerId: workerData.appWorkerId,
              appToken: '[REDACTED]',
            },
          },
        })
      },
    )

    void wait
      .then(() => {
        return log({
          message: 'Core app external worker ending work',
          level: 'INFO',
        })
      })
      .catch((e: unknown) => {
        void log({
          level: 'ERROR',
          message: e instanceof Error ? e.message : '',
        })
        if (
          e &&
          typeof e === 'object' &&
          'name' in e &&
          'message' in e &&
          'stack' in e
        ) {
          void log({
            message: 'Core app external worker thread error',
            level: 'ERROR',
            data: {
              name: e.name,
              message: e.message,
              stack: e.stack,
              appWorkerId: workerData.appWorkerId,
            },
          })
        }
        throw e
      })
      .finally(() => {
        void log({ level: 'INFO', message: 'Shutting down.' })
        cleanup()
      })

    const serverClient = buildAppClient(socket, workerData.socketBaseUrl)

    const uiBundleCacheRoot = path.join(os.tmpdir(), 'lombok-ui-bundle-cache')
    const uiBundleCacheWorkerRoot = path.join(
      uiBundleCacheRoot,
      workerData.appWorkerId,
    )

    console.log(
      'Checking if ui bundle cache directory exists',
      uiBundleCacheRoot,
    )
    if (fs.existsSync(uiBundleCacheRoot)) {
      console.log('Cleaning previous ui bundle cache directory before starting')
      fs.rmdirSync(uiBundleCacheRoot, { recursive: true })
    }
    fs.mkdirSync(uiBundleCacheWorkerRoot, { recursive: true })

    try {
      server = Bun.serve({
        port: 3001,
        idleTimeout: 30,
        hostname: '0.0.0.0',
        routes: {
          '/worker-api/*': async (req) => {
            const url = new URL(req.url)
            const pathname = url.pathname

            const workerIdentifierMatch = pathname.match(
              /^\/worker-api\/([^/]+)/,
            )
            if (!workerIdentifierMatch) {
              return new Response('Invalid worker API path', { status: 400 })
            }

            const workerIdentifier = workerIdentifierMatch[1]

            const host = req.headers.get('host') || ''
            const hostParts = host.split('.')

            if (hostParts.length < 2 || hostParts[1] !== 'apps') {
              return new Response('Invalid host format', { status: 400 })
            }

            const appIdentifier = hostParts[0] || ''

            try {
              const response = await runWorkerScript({
                requestOrTask: req,
                server: serverClient,
                appIdentifier,
                workerIdentifier,
                workerExecutionId: `${workerIdentifier.toLowerCase()}__request__${uniqueExecutionKey()}`,
                options: workerData.executionOptions,
                onStdoutChunk: (text) => {
                  // eslint-disable-next-line no-console
                  console.log(
                    `[${appIdentifier}/${workerIdentifier}] ${text.trimEnd()}`,
                  )
                },
              })

              if (response) {
                return response
              } else {
                return new Response(null, { status: 204 })
              }
            } catch (error: unknown) {
              const errorMessage =
                error instanceof Error ? error.message : String(error)
              return new Response(
                JSON.stringify({
                  error: 'Worker execution failed',
                  message: errorMessage,
                }),
                {
                  status: 500,
                  headers: { 'Content-Type': 'application/json' },
                },
              )
            }
          },
          '/health': () => {
            return new Response(
              JSON.stringify({
                status: 'ok',
                timestamp: new Date().toISOString(),
                workerId: workerData.appWorkerId,
                message: 'Core app worker is running',
              }),
              { headers: { 'Content-Type': 'application/json' } },
            )
          },
        },

        fetch: async (req) => {
          const url = new URL(req.url)
          const pathname = url.pathname.slice(1)

          const host = req.headers.get('host') || ''
          const hostParts = host.split('.')

          if (hostParts.length < 2 || hostParts[1] !== 'apps') {
            return new Response('Invalid host format', { status: 404 })
          }

          const appIdentifier = hostParts[0] || ''

          const appBundleCacheDir = path.join(
            uiBundleCacheWorkerRoot,
            appIdentifier,
          )
          const manifestFilePath = path.join(appBundleCacheDir, 'manifest.json')

          let manifest: AppManifest = {}

          if (fs.existsSync(manifestFilePath)) {
            try {
              const manifestContent = await fs.promises.readFile(
                manifestFilePath,
                'utf-8',
              )
              manifest = JSON.parse(manifestContent) as AppManifest
            } catch (error) {
              void log({
                message: `Error loading manifest: ${error instanceof Error ? error.message : String(error)}`,
                level: 'ERROR',
              })
            }
          } else {
            try {
              const bundleResponse =
                await serverClient.getAppUIbundle(appIdentifier)

              if (bundleResponse.error) {
                return new Response(`Error: ${bundleResponse.error.message}`, {
                  status:
                    typeof bundleResponse.error.code === 'number'
                      ? bundleResponse.error.code
                      : 500,
                })
              }

              const bundleUrl = bundleResponse.result.bundleUrl
              manifest = bundleResponse.result.manifest
              if (!bundleUrl) {
                return new Response('Bundle URL not found', { status: 404 })
              }
              await fs.promises.mkdir(appBundleCacheDir, { recursive: true })

              await fs.promises.writeFile(
                manifestFilePath,
                JSON.stringify(manifest, null, 2),
              )

              const downloadResponse = await fetch(bundleUrl)
              if (!downloadResponse.ok) {
                return new Response('Failed to download bundle', {
                  status: 500,
                })
              }

              const bundleBuffer = await downloadResponse.arrayBuffer()
              const bundlePath = path.join(appBundleCacheDir, 'bundle.zip')
              await fs.promises.writeFile(
                bundlePath,
                new Uint8Array(bundleBuffer),
              )

              const unzipProc = spawn({
                cmd: ['unzip', '-o', bundlePath],
                cwd: appBundleCacheDir,
                stdout: 'inherit',
                stderr: 'inherit',
              })

              const unzipCode = await unzipProc.exited
              if (unzipCode !== 0) {
                return new Response('Failed to extract bundle', {
                  status: 500,
                })
              }
            } catch (error) {
              void log({
                message: `Error downloading/extracting bundle: ${error instanceof Error ? error.message : String(error)}`,
                level: 'ERROR',
              })
              return new Response('Internal server error', { status: 500 })
            }
          }
          let targetPath = ''
          if (pathname in manifest) {
            targetPath = pathname
          } else if (path.join(pathname, 'index.html') in manifest) {
            targetPath = path.join(pathname, 'index.html')
          } else {
            targetPath = 'index.html'
          }

          const filePath = path.join(appBundleCacheDir, targetPath)
          const manifestEntry =
            targetPath in manifest ? manifest[targetPath] : null
          if (manifestEntry) {
            try {
              const fileBuffer = fs.readFileSync(filePath)
              const contentType =
                pathname === '/' ? 'text/html' : manifestEntry.mimeType
              return new Response(fileBuffer, {
                headers: { 'Content-Type': contentType },
              })
            } catch (error) {
              void log({
                message: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
                level: 'ERROR',
              })
              return new Response('Internal server error', { status: 500 })
            }
          }

          return new Response('Not Found', { status: 404 })
        },
      })

      void log({
        message: `HTTP server started on port ${server.port}`,
        level: 'DEBUG',
      })
      try {
        process.stdout.write(
          `${JSON.stringify({
            type: 'core_worker_status',
            status: 'ready',
            port: server.port,
            appWorkerId: workerData.appWorkerId,
          })}\n`,
        )
      } catch {
        void 0
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      void log({
        message: `HTTP server failed to start: ${message}`,
        level: 'ERROR',
      })
      try {
        process.stdout.write(
          `${JSON.stringify({
            type: 'core_worker_status',
            status: 'error',
            error: message,
            appWorkerId: workerData.appWorkerId,
          })}\n`,
        )
      } catch {
        void 0
      }
      cleanup()
      process.exit(1)
    }
  }
})
