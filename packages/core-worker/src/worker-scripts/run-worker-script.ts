import type {
  AppTask,
  PlatformServerMessageInterface,
  SerializeableResponse,
} from '@stellariscloud/app-worker-sdk'
import type {
  SerializeableError,
  WorkerModuleStartContext,
} from '@stellariscloud/core-worker'
import { serializeWorkerError, WorkerError } from '@stellariscloud/core-worker'
import fs from 'fs'
import os from 'os'
import path from 'path'

import { ScriptExecutionError, WorkerScriptRuntimeError } from '../errors'
import { downloadFileToDisk } from '../utils/file.util'

const cacheRoot = path.join(os.tmpdir(), 'stellaris-worker-cache')
if (fs.existsSync(cacheRoot)) {
  // Clean previous worker cache directory before starting
  fs.rmdirSync(cacheRoot, { recursive: true })
}

// Helper function to parse request body based on Content-Type and HTTP method
async function parseRequestBody(request: Request): Promise<unknown> {
  // Methods that typically don't have request bodies
  const methodsWithoutBody = ['GET', 'HEAD', 'DELETE', 'OPTIONS']

  if (methodsWithoutBody.includes(request.method)) {
    return undefined
  }

  // Get the Content-Type header
  const contentType = request.headers.get('Content-Type') || ''

  // Check if there's actually a body to parse
  const contentLength = request.headers.get('Content-Length')
  if (contentLength === '0' || !contentType) {
    return undefined
  }

  try {
    // Parse based on Content-Type
    if (contentType.includes('application/json')) {
      return await request.json()
    } else if (
      contentType.includes('text/plain') ||
      contentType.startsWith('text/')
    ) {
      return await request.text()
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      // Parse form data as an object
      const formData = await request.formData()
      const formObject: Record<string, string> = {}
      for (const [key, value] of formData.entries()) {
        formObject[key] = value.toString()
      }
      return formObject
    } else {
      // Unsupported content type - log warning and try to parse as text
      console.warn(
        `Unsupported Content-Type: ${contentType}. Attempting to parse as text.`,
      )
      return await request.text()
    }
  } catch (error) {
    throw new Error(
      `Failed to parse request body (Content-Type: ${contentType}): ${
        error instanceof Error ? error.message : String(error)
      }`,
    )
  }
}

// Helper function to reconstruct a Response object from SerializeableResponse
export function reconstructResponse(
  serializableResponse: SerializeableResponse,
): Response {
  return new Response(serializableResponse.body, {
    status: serializableResponse.status,
  })
}

// Prepare and cache worker bundle by app/work/hash. Ensures only one setup runs at a time.
async function prepareWorkerBundle({
  appIdentifier,
  workerIdentifier,
  payloadUrl,
  bundleHash,
}: {
  appIdentifier: string
  workerIdentifier: string
  payloadUrl: string
  bundleHash: string
}): Promise<{ cacheDir: string; entrypoint: 'index.js' | 'index.ts' }> {
  const workerCacheRoot = path.join(cacheRoot, appIdentifier, workerIdentifier)
  const cacheDir = path.join(workerCacheRoot, bundleHash)
  const readyMarker = path.join(cacheDir, '.READY')
  const lockFile = path.join(workerCacheRoot, `.lock.${bundleHash}`)

  // Fast-path if already prepared
  if (fs.existsSync(readyMarker)) {
    const entrypoint: 'index.js' | 'index.ts' = fs.existsSync(
      path.join(cacheDir, workerIdentifier, 'index.js'),
    )
      ? 'index.js'
      : 'index.ts'
    return { cacheDir, entrypoint }
  }

  fs.mkdirSync(workerCacheRoot, { recursive: true })

  // Try to acquire lock atomically
  let haveLock = false
  try {
    fs.openSync(lockFile, 'wx')
    haveLock = true
  } catch {
    // lock exists; wait for READY up to 30s
    // intentionally empty
  }

  if (!haveLock) {
    const start = Date.now()
    const timeoutMs = 30_000
    // Busy-wait with small delay until READY appears or timeout
    while (Date.now() - start < timeoutMs) {
      if (fs.existsSync(readyMarker)) {
        const entrypoint: 'index.js' | 'index.ts' = fs.existsSync(
          path.join(cacheDir, workerIdentifier, 'index.js'),
        )
          ? 'index.js'
          : 'index.ts'
        return { cacheDir, entrypoint }
      }
      await new Promise((resolve) => setTimeout(resolve, 200))
    }
    throw new Error(
      `Timed out waiting for worker bundle preparation for ${appIdentifier}/${workerIdentifier}@${bundleHash}`,
    )
  }

  // We have the lock; double-check another process didn't finish in between
  try {
    if (fs.existsSync(readyMarker)) {
      const entrypoint: 'index.js' | 'index.ts' = fs.existsSync(
        path.join(cacheDir, workerIdentifier, 'index.js'),
      )
        ? 'index.js'
        : 'index.ts'
      return { cacheDir, entrypoint }
    }

    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'worker-prep-'))
    const zipPath = path.join(tmpRoot, 'worker-module.zip')
    await downloadFileToDisk(payloadUrl, zipPath)

    const unzipProc = Bun.spawn({
      cmd: ['unzip', zipPath, '-d', tmpRoot],
      stdout: 'inherit',
      stderr: 'inherit',
    })
    const unzipCode = await unzipProc.exited
    if (unzipCode !== 0) {
      throw new Error('Failed to unzip worker payload during prepare')
    }

    // Move prepared contents into versioned cacheDir
    fs.mkdirSync(cacheDir, { recursive: true })
    // Copy all files from tmpRoot except the zip itself into cacheDir
    for (const entry of fs.readdirSync(tmpRoot)) {
      if (entry === 'worker-module.zip') {
        continue
      }
      const src = path.join(tmpRoot, entry)
      const dest = path.join(cacheDir, entry)
      fs.cpSync(src, dest, { recursive: true })
    }
    // Mark as ready
    fs.writeFileSync(readyMarker, '')

    const entrypoint: 'index.js' | 'index.ts' = fs.existsSync(
      path.join(cacheDir, workerIdentifier, 'index.js'),
    )
      ? 'index.js'
      : 'index.ts'
    return { cacheDir, entrypoint }
  } finally {
    // Release lock
    try {
      fs.rmSync(lockFile, { force: true })
    } catch {
      // ignore
    }
  }
}

export const runWorkerScript = async ({
  requestOrTask,
  server,
  appIdentifier,
  workerIdentifier,
  workerExecutionId,
  options: { printWorkerOutput = true, removeWorkerDirectory = true } = {
    printWorkerOutput: true,
    removeWorkerDirectory: true,
  },
}: {
  server: PlatformServerMessageInterface
  requestOrTask: Request | AppTask
  appIdentifier: string
  workerIdentifier: string
  workerExecutionId: string
  options?: {
    printWorkerOutput?: boolean
    removeWorkerDirectory?: boolean
  }
}): Promise<SerializeableResponse | undefined> => {
  const isRequest = requestOrTask instanceof Request
  const workerRootPath = path.join(os.tmpdir(), workerExecutionId)
  const logsDir = path.join(workerRootPath, 'logs')
  const workerTmpDir = path.join(workerRootPath, 'tmp')
  const builtinsDir = path.join(workerRootPath, 'builtins')
  const outLogPath = path.join(logsDir, 'output.log')
  const errOutputPath = path.join(logsDir, 'error.json')
  const resultOutputPath = path.join(logsDir, 'result.json')

  // Create the directories
  fs.mkdirSync(workerRootPath)
  fs.mkdirSync(logsDir)
  fs.mkdirSync(workerTmpDir)
  fs.mkdirSync(builtinsDir)

  // Create the log files
  await Promise.all([
    Bun.file(outLogPath).write(''),
    Bun.file(errOutputPath).write(''),
    Bun.file(resultOutputPath).write(''),
  ])

  const { result: workerExecutionDetails } =
    await server.getWorkerExecutionDetails(appIdentifier, workerIdentifier)

  const workerEnvVars = Object.keys(
    workerExecutionDetails.environmentVariables,
  ).reduce<string[]>(
    (acc, next) =>
      acc.concat(
        `WORKER_ENV_${next.trim()}=${workerExecutionDetails.environmentVariables[next].trim()}`,
      ),
    [],
  )

  // Prepare or reuse cached worker bundle by hash
  const { cacheDir, entrypoint } = await prepareWorkerBundle({
    appIdentifier,
    workerIdentifier,
    payloadUrl: workerExecutionDetails.payloadUrl,
    bundleHash: workerExecutionDetails.hash,
  })

  const workerWrapperScript = './worker-script-wrapper.ts'
  const workerScriptWrapperPath = path.join(__dirname, workerWrapperScript)
  fs.copyFileSync(
    workerScriptWrapperPath,
    path.join(workerRootPath, workerWrapperScript),
  )

  const environmentVariables = workerEnvVars.map((v) => v.trim())

  // Serialize the request or task for the sandbox
  const serializedRequestOrTask = isRequest
    ? {
        url: requestOrTask.url.replace(
          new RegExp(`/worker-api/${workerIdentifier}`),
          '',
        ), // Trim the "/worker-api/${workerIdentifier}" prefix
        method: requestOrTask.method,
        headers: Object.fromEntries(requestOrTask.headers.entries()),
        body: (await parseRequestBody(requestOrTask)) ?? '',
        // Add other properties you need from the Request
      }
    : requestOrTask

  const workerModuleStartContext: WorkerModuleStartContext = {
    resultFilepath: resultOutputPath.replace(workerRootPath, ''),
    outputLogFilepath: outLogPath.replace(workerRootPath, ''),
    errorLogFilepath: errOutputPath.replace(workerRootPath, ''),
    scriptPath: `./app/${workerIdentifier}/${entrypoint}`,
    workerToken: workerExecutionDetails.workerToken,
    executionId: workerExecutionId,
    executionType: isRequest ? 'request' : 'task',
    workerIdentifier,
    serverBaseUrl: server.getServerBaseUrl(),
    // Add the serialized request or task
    request: isRequest
      ? (serializedRequestOrTask as WorkerModuleStartContext['request'])
      : undefined,
    task: !isRequest ? (serializedRequestOrTask as AppTask) : undefined,
  }

  const proc = Bun.spawn({
    cmd: [
      'nsjail',
      '--disable_clone_newnet',
      '--disable_rlimits',
      '--keep_caps',
      '--disable_clone_newpid',
      '--disable_proc',
      `--chroot=${workerRootPath}`,
      '--user=1001',
      '--group=1001',
      `--bindmount=${logsDir}:/logs`,
      `--bindmount=${workerTmpDir}:/tmp`,
      `--bindmount_ro=${cacheDir}:/app`,
      '--bindmount_ro=/usr/src/app/node_modules:/node_modules',
      '--bindmount_ro=/usr/src/app/packages:/node_modules/@stellariscloud',
      '--bindmount_ro=/usr/src/app/packages/stellaris-utils:/node_modules/@stellariscloud/utils',
      '--bindmount_ro=/usr/src/app/packages/stellaris-types:/node_modules/@stellariscloud/types',
      '--bindmount_ro=/usr/bin/ldd:/usr/bin/ldd',
      '--bindmount_ro=/usr/local/bin/bun:/usr/local/bin/bun',
      '--bindmount_ro=/etc/resolv.conf:/etc/resolv.conf',
      '--bindmount_ro=/lib/ld-musl-aarch64.so.1:/lib/ld-musl-aarch64.so.1',
      '--bindmount_ro=/usr/lib/libstdc++.so.6:/usr/lib/libstdc++.so.6',
      '--bindmount_ro=/usr/lib/libgcc_s.so.1:/usr/lib/libgcc_s.so.1',
      '--bindmount_ro=/usr/src/app/packages/core-worker/src/worker-scripts/tsconfig.worker-script.json:/tsconfig.json',
      '--bindmount=/dev/null:/dev/null',
      '--bindmount=/dev/random:/dev/random',
      '--bindmount=/dev/urandom:/dev/urandom',
      ...environmentVariables.map((v) => `-E${v}`),
      `-ETMPDIR=${workerTmpDir.replace(workerRootPath, '')}`,
      '-Mo',
      '-v',
      '--log_fd=1',
      '--',
      '/usr/local/bin/bun',
      `./${workerWrapperScript}`,
      JSON.stringify(workerModuleStartContext),
    ],
    stdout: 'inherit',
    stderr: 'inherit',
  })
  try {
    const exitCode = await proc.exited
    if (printWorkerOutput) {
      console.log(
        ...[
          '',
          'WORKER LOG OUTPUT',
          '==================',
          await Bun.file(outLogPath).text(),
          '==================',
        ].map((line) => `${line}\n`),
      )
    }

    if (exitCode !== 0) {
      let parsedErr: SerializeableError
      const errStr = await Bun.file(errOutputPath).text()

      try {
        const parsedErrObj = JSON.parse(errStr) as
          | SerializeableError
          | undefined
        parsedErr = !parsedErrObj
          ? (JSON.parse(
              serializeWorkerError(new WorkerError(String(errStr))),
            ) as SerializeableError)
          : (parsedErrObj.innerError ?? parsedErrObj)
      } catch (err: unknown) {
        parsedErr = JSON.parse(
          serializeWorkerError(new WorkerError(String(errStr), err)),
        ) as SerializeableError
      }
      const errorClassName = parsedErr.className

      console.log(
        ...[
          '',
          `WORKER ERROR: ${errorClassName}`,
          '==================',
          `ERROR: ${parsedErr.name}: ${parsedErr.message}`,
          parsedErr.stack,
          '==================',
        ].map((line) => `${line}\n`),
      )

      throw new WorkerScriptRuntimeError(
        `Failure during worker script execution. Exit code: ${exitCode}`,
        {
          className: parsedErr.className,
          name: parsedErr.name,
          message: parsedErr.message,
          stack: parsedErr.stack ?? '',
          ...(parsedErr.innerError && {
            innerError: {
              className: parsedErr.innerError.className,
              name: parsedErr.innerError.name,
              message: parsedErr.innerError.message,
              stack: parsedErr.innerError.stack ?? '',
            },
          }),
        },
      )
    }

    if (!isRequest) {
      return
    }

    // Parse the result from the response output file
    let response: SerializeableResponse
    try {
      response = JSON.parse(
        await Bun.file(resultOutputPath).text(),
      ) as SerializeableResponse
    } catch (parseError) {
      throw new ScriptExecutionError('Failed to parse worker response', {
        parseError:
          parseError instanceof Error ? parseError.message : String(parseError),
        exitCode,
      })
    }
    return response
  } catch (executeError) {
    throw new ScriptExecutionError('Failed to execute worker', {
      parseError:
        executeError instanceof Error
          ? executeError.message
          : String(executeError),
      exitCode: process.exitCode,
    })
  } finally {
    if (removeWorkerDirectory && fs.existsSync(workerRootPath)) {
      console.log('Removing worker directory:', workerRootPath)
      fs.rmSync(workerRootPath, { recursive: true })
    }
  }
}
