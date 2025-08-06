import { buildAppClient } from '@stellariscloud/app-worker-sdk'
import {
  analyzeObjectTaskHandler,
  connectAndPerformWork,
  reconstructResponse,
  runWorkerScript,
  runWorkerScriptTaskHandler,
  uniqueExecutionKey,
} from '@stellariscloud/core-worker'
import type { AppManifest } from '@stellariscloud/types'
import { spawn } from 'bun'
import fs from 'fs'
import fsPromises from 'fs/promises'
import * as jwt from 'jsonwebtoken'
import os from 'os'
import path from 'path'
import { z } from 'zod'

const coreWorkerProcessDataPayloadSchema = z.object({
  appWorkerId: z.string(),
  appToken: z.string(),
  socketBaseUrl: z.string(),
  jwtSecret: z.string(),
  hostId: z.string(),
  executionOptions: z
    .object({
      printWorkerOutput: z.boolean().optional(),
      emptyWorkerTmpDir: z.boolean().optional(),
    })
    .optional(),
})

export type CoreWorkerProcessDataPayload = z.infer<
  typeof coreWorkerProcessDataPayloadSchema
>

// JWT constants and types (copied from jwt.service.ts)
const APP_USER_JWT_SUB_PREFIX = 'app_user:'
const ALGORITHM = 'HS256'

class AuthTokenInvalidError extends Error {
  name = 'AuthTokenInvalidError'
  constructor(
    readonly token: string,
    message?: string,
  ) {
    super(message || 'Invalid token')
  }
}

class AuthTokenExpiredError extends Error {
  name = 'AuthTokenExpiredError'
  constructor(
    readonly token: string,
    message?: string,
  ) {
    super(message || 'Token expired')
  }
}

// JWT verification function
function verifyAppUserJWT({
  appIdentifier,
  userId,
  token,
  jwtSecret,
  hostId,
}: {
  appIdentifier: string
  userId: string
  token: string
  jwtSecret: string
  hostId: string
}) {
  try {
    return jwt.verify(token, jwtSecret, {
      algorithms: [ALGORITHM],
      audience: hostId,
      subject: `${APP_USER_JWT_SUB_PREFIX}${userId}:${appIdentifier}`,
    })
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new AuthTokenExpiredError(token, error.message)
    }
    if (error instanceof jwt.JsonWebTokenError) {
      throw new AuthTokenInvalidError(token, error.message)
    }
    throw error
  }
}

// Authentication middleware
function authenticateAppUserRequest(
  req: Request,
  appIdentifier: string,
  jwtSecret: string,
  hostId: string,
): { userId: string } {
  const authHeader = req.headers.get('Authorization')

  if (!authHeader?.startsWith('Bearer ')) {
    throw new AuthTokenInvalidError(
      '',
      'Missing or invalid Authorization header',
    )
  }

  const token = authHeader.slice('Bearer '.length)

  try {
    // First decode to get the subject
    const decoded = jwt.decode(token, { complete: true })
    if (!decoded?.payload || typeof decoded.payload === 'string') {
      throw new AuthTokenInvalidError(token, 'Invalid token payload')
    }

    const subject = decoded.payload.sub
    if (!subject?.startsWith(APP_USER_JWT_SUB_PREFIX)) {
      throw new AuthTokenInvalidError(token, 'Invalid token type')
    }

    // Extract userId and app identifier from subject: app_user:{userId}:{appIdentifier}
    const subjectParts = subject.split(':')
    if (subjectParts.length !== 3) {
      throw new AuthTokenInvalidError(token, 'Invalid token subject format')
    }

    const userId = subjectParts[1]
    const tokenAppIdentifier = subjectParts[2]

    // Verify the app identifier matches
    if (tokenAppIdentifier !== appIdentifier) {
      throw new AuthTokenInvalidError(token, 'Token app identifier mismatch')
    }

    // Verify and validate the token
    verifyAppUserJWT({
      appIdentifier,
      userId,
      token,
      jwtSecret,
      hostId,
    })

    return { userId }
  } catch (error) {
    if (
      error instanceof AuthTokenInvalidError ||
      error instanceof AuthTokenExpiredError
    ) {
      throw error
    }
    throw new AuthTokenInvalidError(token, 'Token verification failed')
  }
}

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
  const workerData: CoreWorkerProcessDataPayload = JSON.parse(data.toString())
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
        ['ANALYZE_OBJECT']: analyzeObjectTaskHandler,
        ['RUN_WORKER_SCRIPT']: runWorkerScriptTaskHandler,
      },
      async () => {
        await log({
          message: 'Core app external worker thread started',
          level: 'DEBUG',
          data: {
            workerData: {
              socketBaseUrl: workerData.socketBaseUrl,
              host: workerData.hostId,
              executionOptions: workerData.executionOptions,
              appWorkerId: workerData.appWorkerId,
              appToken: '[REDACTED]',
              jwtSecret: '[REDACTED]',
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

    // start a http server on port 3001
    server = Bun.serve({
      port: 3001,

      routes: {
        '/worker-api/*': async (req) => {
          const url = new URL(req.url)
          const pathname = url.pathname

          const workerIdentifierMatch = pathname.match(/^\/worker-api\/([^/]+)/)
          if (!workerIdentifierMatch) {
            return new Response('Invalid worker API path', { status: 400 })
          }

          const workerIdentifier = workerIdentifierMatch[1]

          // Parse the host to get app info (same pattern as static assets)
          const host = req.headers.get('host') || ''
          const hostParts = host.split('.')

          // Validate host format: should have at least 3 parts with "apps" as the third part
          if (hostParts.length < 3 || hostParts[2] !== 'apps') {
            return new Response('Invalid host format', { status: 400 })
          }

          const appIdentifier = hostParts[1] || 'unknown'

          // Authenticate the request
          try {
            const { userId } = authenticateAppUserRequest(
              req,
              appIdentifier,
              workerData.jwtSecret,
              workerData.hostId,
            )
            void log({
              message: `Authenticated user: ${userId} for app: ${appIdentifier}`,
              level: 'DEBUG',
            })
          } catch (error) {
            return new Response(
              JSON.stringify({
                error: 'Authentication failed',
                message: error instanceof Error ? error.message : String(error),
              }),
              {
                status: 401,
                headers: { 'Content-Type': 'application/json' },
              },
            )
          }

          try {
            // Call runWorkerScript with the request and parsed parameters
            const serializableResponse = await runWorkerScript({
              requestOrTask: req,
              server: serverClient,
              appIdentifier,
              workerIdentifier,
              workerExecutionId: `${workerIdentifier.toLowerCase()}__request__${uniqueExecutionKey()}`,
              options: workerData.executionOptions,
            })

            // Return the response or 204 No Content if no response
            if (serializableResponse) {
              return reconstructResponse(serializableResponse)
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
        if (pathname === '/health') {
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

        let manifest: AppManifest = {}

        // Try to load existing manifest (denoting bundle has been downloaded)
        if (fs.existsSync(manifestFilePath)) {
          try {
            const manifestContent = await fsPromises.readFile(
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

            // Create the cache directory first
            await fsPromises.mkdir(bundleCacheDir, { recursive: true })

            // Save manifest to file for future use
            await fsPromises.writeFile(
              manifestFilePath,
              JSON.stringify(manifest, null, 2),
            )

            // Download and extract the bundle

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
            void log({
              message: `Error downloading/extracting bundle: ${error instanceof Error ? error.message : String(error)}`,
              level: 'ERROR',
            })
            return new Response('Internal server error', { status: 500 })
          }
        }

        // Determine the file path to serve
        const targetPath = pathname === '/' ? 'index.html' : pathname
        const filePath = path.join(bundleCacheDir, uiName, targetPath)
        const manifestPath = path.join('/', 'ui', uiName, targetPath)
        const manifestEntry =
          manifestPath in manifest ? manifest[manifestPath] : null
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
  }
})
