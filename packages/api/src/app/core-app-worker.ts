import { buildAppClient } from '@stellariscloud/app-worker-sdk'
import {
  analyzeObjectTaskHandler,
  connectAndPerformWork,
  runWorkerScriptHandler,
} from '@stellariscloud/core-worker'
import type { AppManifest } from '@stellariscloud/types'
import { spawn } from 'bun'
import fs from 'fs'
import fsPromises from 'fs/promises'
import os from 'os'
import path from 'path'
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

    const serverClient = buildAppClient(socket, workerData.socketBaseUrl)

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
              ],
            }),
            {
              headers: { 'Content-Type': 'application/json' },
            },
          )
        },
      },

      // Handle all UI bundle requests (root and static assets)
      fetch: async (req) => {
        const url = new URL(req.url)
        const pathname = url.pathname

        // Skip if it's a known route
        if (pathname === '/health' || pathname === '/api/info') {
          return new Response('Not Found', { status: 404 })
        }

        // Parse the host to get app and UI info
        const host = req.headers.get('host') || ''
        const hostParts = host.split('.')

        // Validate host format: should have at least 3 parts with "apps" as the third part
        if (hostParts.length < 3 || hostParts[2] !== 'apps') {
          return new Response('Invalid host format', { status: 404 })
        }

        const uiName = hostParts[0] || 'unknown'
        const appIdentifier = hostParts[1] || 'unknown'

        // Create cache key and directory
        const bundleCacheKey = `${appIdentifier}-${uiName}`
        const bundleCacheDir = path.join(
          os.tmpdir(),
          `stellaris-bundle-${bundleCacheKey}`,
        )
        const manifestFilePath = path.join(bundleCacheDir, 'manifest.json')

        let manifest: AppManifest = []

        // Try to load existing manifest (denoting bundle has been downloaded)
        if (fs.existsSync(manifestFilePath)) {
          try {
            const manifestContent = await fsPromises.readFile(
              manifestFilePath,
              'utf-8',
            )
            manifest = JSON.parse(manifestContent) as AppManifest
          } catch (error) {
            console.error('Error loading manifest:', error)
          }
        } else {
          try {
            // Get the UI bundle URL from the server
            const bundleResponse = await serverClient.getAppUIbundle(
              appIdentifier,
              uiName,
            )

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

            // Save manifest to file for future use
            await fsPromises.writeFile(
              manifestFilePath,
              JSON.stringify(manifest, null, 2),
            )

            // Download and extract the bundle
            await fsPromises.mkdir(bundleCacheDir, { recursive: true })

            // Download the bundle
            const downloadResponse = await fetch(bundleUrl)
            if (!downloadResponse.ok) {
              return new Response('Failed to download bundle', {
                status: 500,
              })
            }

            const bundleBuffer = await downloadResponse.arrayBuffer()
            const bundlePath = path.join(bundleCacheDir, 'bundle.zip')
            await fsPromises.writeFile(bundlePath, new Uint8Array(bundleBuffer))

            // Extract the bundle
            const unzipProc = spawn({
              cmd: ['unzip', '-o', bundlePath],
              cwd: bundleCacheDir,
              stdout: 'inherit',
              stderr: 'inherit',
            })

            const unzipCode = await unzipProc.exited
            if (unzipCode !== 0) {
              return new Response('Failed to extract bundle', { status: 500 })
            }

            // Clean up the zip file
            await fsPromises.unlink(bundlePath)
          } catch (error) {
            console.error('Error downloading/extracting bundle:', error)
            return new Response('Internal server error', { status: 500 })
          }
        }

        // Determine the file path to serve
        const targetPath = pathname === '/' ? 'index.html' : pathname
        const filePath = path.join(bundleCacheDir, uiName, targetPath)
        const manifestPath = path.join('/', 'ui', uiName, targetPath)

        const manifestEntry = manifest.find(
          (_manifestEntry) => _manifestEntry.path === manifestPath,
        )
        if (manifestEntry) {
          try {
            const fileBuffer = fs.readFileSync(filePath)
            const contentType =
              pathname === '/' ? 'text/html' : manifestEntry.mimeType
            return new Response(fileBuffer, {
              headers: { 'Content-Type': contentType },
            })
          } catch (error) {
            console.error('Error reading file:', error)
            return new Response('Internal server error', { status: 500 })
          }
        }

        return new Response('Not Found', { status: 404 })
      },
    })

    console.log(`HTTP server started on port ${server.port}`)
  }
})
