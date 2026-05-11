import type { AppManifest } from '@lombokapp/types'
import { LogEntryLevel } from '@lombokapp/types'
import type {
  AppUiBundle,
  CoreWorkerMessagePayloadTypes,
  ServerlessWorkerExecConfig,
} from '@lombokapp/worker-utils'
import { AsyncWorkError, uniqueExecutionKey } from '@lombokapp/worker-utils'
import fs from 'fs'
import path from 'path'
import { runWorker } from 'src/worker-scripts/run-worker'

const API_SERVER_PREFIX = 'api-server--'
const APP_SERVER_PREFIX = 'app-server--'

export const buildAppRequestServer = ({
  log,
  appUiHashMapping,
  uiBundleCacheWorkerRoot,
  instanceId,
  serverBaseUrl,
  executionOptions,
  getWorkerExecConfig,
  getUiBundle,
}: {
  log: (log: {
    message: string
    level: LogEntryLevel
    data?: Record<string, unknown>
  }) => void
  appUiHashMapping: Record<string, string>
  uiBundleCacheWorkerRoot: string
  instanceId: string
  serverBaseUrl: string
  executionOptions: CoreWorkerMessagePayloadTypes['init']['request']['executionOptions']
  getWorkerExecConfig: (params: {
    appIdentifier: string
    workerIdentifier: string
  }) => Promise<ServerlessWorkerExecConfig>
  getUiBundle: (params: { appIdentifier: string }) => Promise<AppUiBundle>
}) => {
  const handleWorkerApiRequest = async (
    req: Request,
    appIdentifier: string,
    workerIdentifier: string,
  ): Promise<Response> => {
    let serverlessWorkerDetails: ServerlessWorkerExecConfig
    try {
      serverlessWorkerDetails = await getWorkerExecConfig({
        appIdentifier,
        workerIdentifier,
      })
    } catch (error) {
      return new Response(
        error instanceof Error ? error.message : 'Worker lookup failed',
        { status: 500 },
      )
    }

    const workerHash = serverlessWorkerDetails.hash

    if (!workerHash) {
      log({
        message: `Worker hash not found for app: ${appIdentifier}`,
        level: LogEntryLevel.ERROR,
        data: {
          appIdentifier,
          requestUrl: req.url,
        },
      })
      return new Response('Unexpected error', { status: 500 })
    }

    try {
      const response = await runWorker({
        requestOrTask: req,
        isSystemRequest: false,
        serverBaseUrl,
        appIdentifier,
        workerHash,
        workerIdentifier,
        workerExecutionId: `${workerIdentifier.toLowerCase()}__request__${uniqueExecutionKey()}`,
        options: executionOptions,
        serverlessWorkerDetails,
        onStdoutChunk:
          executionOptions?.printWorkerOutput !== false
            ? (text) => {
                // eslint-disable-next-line no-console
                console.log(
                  `[${appIdentifier}/${workerIdentifier}] ${text.trimEnd()}`,
                )
              }
            : undefined,
      })

      if (response) {
        return response
      }
      return new Response(null, { status: 204 })
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error)
      const status =
        error instanceof AsyncWorkError &&
        error.code === 'WORKER_REQUEST_AUTHENTICATION_FAILED'
          ? 401
          : 500
      return new Response(
        JSON.stringify({
          error:
            status === 401
              ? 'Worker request authentication failed'
              : 'Worker execution failed',
          message: errorMessage,
        }),
        {
          status,
          headers: { 'Content-Type': 'application/json' },
        },
      )
    }
  }

  const handleUiBundleRequest = async (
    req: Request,
    appIdentifier: string,
  ): Promise<Response> => {
    const url = new URL(req.url)
    const pathname = url.pathname.slice(1)

    let uiHash = appUiHashMapping[appIdentifier] ?? ''

    let appBundleCacheDir = uiHash
      ? path.join(uiBundleCacheWorkerRoot, appIdentifier, uiHash)
      : ''
    let manifestFilePath = appBundleCacheDir
      ? path.join(appBundleCacheDir, 'manifest.json')
      : ''
    let cspFilePath = appBundleCacheDir
      ? path.join(appBundleCacheDir, 'csp.txt')
      : ''

    let manifest: AppManifest = {}
    let csp = ''

    if (uiHash && fs.existsSync(manifestFilePath)) {
      try {
        const manifestContent = await fs.promises.readFile(
          manifestFilePath,
          'utf-8',
        )
        csp = await fs.promises.readFile(cspFilePath, 'utf-8')
        manifest = JSON.parse(manifestContent) as AppManifest
      } catch (error) {
        log({
          message: `Error loading manifest: ${error instanceof Error ? error.message : String(error)}`,
          level: LogEntryLevel.ERROR,
        })
      }
    } else {
      try {
        const bundleResponse = await getUiBundle({ appIdentifier })
        if (!bundleResponse.uiHash) {
          return new Response('App not ready', { status: 409 })
        }

        if (bundleResponse.uiHash !== uiHash) {
          uiHash = bundleResponse.uiHash
          appUiHashMapping[appIdentifier] = bundleResponse.uiHash
        }

        appBundleCacheDir = path.join(
          uiBundleCacheWorkerRoot,
          appIdentifier,
          uiHash,
        )
        manifestFilePath = path.join(appBundleCacheDir, 'manifest.json')
        cspFilePath = path.join(appBundleCacheDir, 'csp.txt')

        const bundleUrl = bundleResponse.bundleUrl
        manifest = bundleResponse.manifest
        csp = bundleResponse.csp ?? ''

        if (!bundleUrl) {
          return new Response('Bundle URL not found', { status: 404 })
        }

        await fs.promises.mkdir(appBundleCacheDir, { recursive: true })
        await fs.promises.writeFile(
          manifestFilePath,
          JSON.stringify(manifest, null, 2),
        )
        await fs.promises.writeFile(cspFilePath, csp)

        const downloadResponse = await fetch(bundleUrl)
        if (!downloadResponse.ok) {
          return new Response('Failed to download bundle', {
            status: 500,
          })
        }

        const bundleBuffer = await downloadResponse.arrayBuffer()
        const bundlePath = path.join(appBundleCacheDir, 'bundle.zip')
        await fs.promises.writeFile(bundlePath, new Uint8Array(bundleBuffer))

        const unzipProc = Bun.spawn({
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
        log({
          message: `Error downloading/extracting bundle: ${error instanceof Error ? error.message : String(error)}`,
          level: LogEntryLevel.ERROR,
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
    const manifestEntry = targetPath in manifest ? manifest[targetPath] : null
    if (manifestEntry) {
      try {
        const fileBuffer = fs.readFileSync(filePath)
        const contentType =
          pathname === '/' ? 'text/html' : manifestEntry.mimeType
        return new Response(fileBuffer, {
          headers: {
            'Content-Type': contentType,
            ...(csp ? { 'Content-Security-Policy': csp } : {}),
          },
        })
      } catch (error) {
        log({
          message: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
          level: LogEntryLevel.ERROR,
        })
        return new Response('Internal server error', { status: 500 })
      }
    }

    return new Response('Not Found', { status: 404 })
  }

  const server = Bun.serve({
    port: 3001,
    idleTimeout: 30,
    hostname: '0.0.0.0',
    routes: {
      '/health': () => {
        return new Response(
          JSON.stringify({
            status: 'ok',
            timestamp: new Date().toISOString(),
            workerId: instanceId,
            message: 'Core worker is running',
          }),
          { headers: { 'Content-Type': 'application/json' } },
        )
      },
    },

    fetch: async (req) => {
      const host = req.headers.get('host') ?? ''
      const subdomain = host.split('.')[0] ?? ''

      if (subdomain.startsWith(API_SERVER_PREFIX)) {
        const rest = subdomain.slice(API_SERVER_PREFIX.length)
        const separatorIdx = rest.indexOf('--')
        if (separatorIdx < 0) {
          return new Response('Invalid api-server subdomain', { status: 400 })
        }
        const workerIdentifier = rest.slice(0, separatorIdx)
        const appIdentifier = rest.slice(separatorIdx + 2)
        if (!workerIdentifier || !appIdentifier) {
          return new Response('Invalid api-server subdomain', { status: 400 })
        }
        return handleWorkerApiRequest(req, appIdentifier, workerIdentifier)
      }

      if (subdomain.startsWith(APP_SERVER_PREFIX)) {
        const appIdentifier = subdomain.slice(APP_SERVER_PREFIX.length)
        if (!appIdentifier) {
          return new Response('Invalid host format', { status: 404 })
        }
        return handleUiBundleRequest(req, appIdentifier)
      }

      return new Response('Invalid host format', { status: 404 })
    },
  })

  log({
    message: `HTTP server started on port ${server.port}`,
    level: LogEntryLevel.DEBUG,
  })
  try {
    process.stdout.write(
      `${JSON.stringify({
        type: 'core_worker_status',
        status: 'ready',
        port: server.port,
        instanceId,
      })}\n`,
    )
  } catch {
    void 0
  }
  return server
}
