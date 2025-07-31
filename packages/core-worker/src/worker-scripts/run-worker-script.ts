import fs from 'fs'
import os from 'os'
import path from 'path'
import crypto from 'crypto'
import { v4 as uuidV4 } from 'uuid'
import { $ } from 'bun'

import { downloadFileToDisk } from '../utils/file.util'
import {
  AppTask,
  CoreServerMessageInterface,
  SerializeableResponse,
} from '@stellariscloud/app-worker-sdk'

// Helper function to parse request body based on Content-Type and HTTP method
async function parseRequestBody(request: Request): Promise<any> {
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

export const runWorkerScript = async ({
  requestOrTask,
  server,
  appIdentifier,
  workerIdentifier,
}: {
  requestOrTask: Request | AppTask
  server: CoreServerMessageInterface
  appIdentifier: string
  workerIdentifier: string
}): Promise<SerializeableResponse | undefined> => {
  const isRequest = requestOrTask instanceof Request

  const baseIdentifier = isRequest
    ? requestOrTask.url
    : `task-${requestOrTask.id}`

  const workerExecutionId = `${baseIdentifier}-${crypto
    .createHash('sha256')
    .update(uuidV4())
    .digest('hex')
    .substring(0, 8)}`

  console.log('About to start script:', workerExecutionId)

  const tempDir = fs.mkdtempSync(
    path.join(os.tmpdir(), `stellaris_${appIdentifier}_${workerIdentifier}`),
  )

  const workerPayloadPathname = `${appIdentifier}__${workerIdentifier}`
  const inFilepath = path.join(tempDir, `${workerPayloadPathname}.zip`)
  const workerDirectory = path.join(tempDir, workerPayloadPathname)

  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir)
  }

  const { result: workerExecutionDetails } =
    await server.getWorkerExecutionDetails(appIdentifier, workerIdentifier)

  const workerScriptEnvVars = Object.keys(
    workerExecutionDetails.envVars ?? {},
  ).reduce<string[]>(
    (acc, next) =>
      acc.concat(
        `WORKER_SCRIPT_VAR_${next.trim()}=${workerExecutionDetails.envVars[next].trim()}`,
      ),
    [],
  )

  console.log(
    'About to download worker payload:',
    workerExecutionDetails.payloadUrl,
  )
  await downloadFileToDisk(workerExecutionDetails.payloadUrl, inFilepath)

  const unzipProc = Bun.spawn({
    cmd: ['unzip', inFilepath, '-d', workerDirectory],
    stdout: 'inherit',
    stderr: 'inherit',
  })
  const unzipCode = await unzipProc.exited
  if (unzipCode !== 0) {
    throw new Error('Failed to unzip worker payload')
  }
  const workerWrapperScript = './worker-script-wrapper.ts'
  const workerScriptWrapperPath = path.join(__dirname, workerWrapperScript)
  fs.copyFileSync(
    workerScriptWrapperPath,
    path.join(workerDirectory, workerWrapperScript),
  )

  const envVars = workerScriptEnvVars.map((v) => v.trim())

  console.log('envVars:', envVars)
  const entrypoint = fs.existsSync(
    path.join(workerDirectory, workerIdentifier, 'index.js'),
  )
    ? `index.js`
    : `index.ts`

  // Serialize the request or task for the sandbox
  let serializedRequestOrTask = isRequest
    ? {
        url: requestOrTask.url,
        method: requestOrTask.method,
        headers: Object.fromEntries(requestOrTask.headers.entries()),
        body: await parseRequestBody(requestOrTask),
        // Add other properties you need from the Request
      }
    : requestOrTask

  const workerStartContext = {
    scriptPath: `./${workerIdentifier}/${entrypoint}`,
    workerToken: workerExecutionDetails.workerToken,
    executionId: workerExecutionId,
    executionType: isRequest ? 'request' : 'task',
    workerIdentifier,
    serverBaseUrl: server.getServerBaseUrl(),
    // Add the serialized request or task
    request: isRequest ? serializedRequestOrTask : undefined,
    task: !isRequest ? serializedRequestOrTask : undefined,
  }

  const proc = Bun.spawn({
    cmd: [
      'nsjail',
      '--disable_clone_newnet',
      '--disable_rlimits',
      '--keep_caps',
      '--disable_clone_newpid',
      '--disable_proc',
      `--chroot=${workerDirectory}`,
      '--user=1001',
      '--group=1001',
      '--bindmount=/usr/local/bin/bun:/usr/local/bin/bun',
      '--bindmount_ro=/lib/ld-musl-aarch64.so.1:/lib/ld-musl-aarch64.so.1',
      '--bindmount_ro=/usr/lib/libstdc++.so.6:/usr/lib/libstdc++.so.6',
      '--bindmount_ro=/usr/lib/libgcc_s.so.1:/usr/lib/libgcc_s.so.1',
      '--bindmount_ro=/usr/src/app/node_modules:/node_modules',
      '--bindmount_ro=/usr/src/app/packages/core-worker/src/worker-scripts/tsconfig.worker-script.json:/tsconfig.json',
      '--bindmount_ro=/usr/src/app/packages/app-worker-sdk:/builtins/app-worker-sdk',
      '--bindmount=/dev/null:/dev/null',
      '--bindmount=/dev/random:/dev/random',
      '--bindmount=/dev/urandom:/dev/urandom',
      ...envVars.map((v) => `-E${v}`),
      '-Mo',
      '-v',
      '--',
      '/usr/local/bin/bun',
      `./${workerWrapperScript}`,
      JSON.stringify(workerStartContext),
    ],
    stdout: 'pipe',
    stderr: 'pipe',
  })

  const exitCode = await proc.exited
  const stdout = await new Response(proc.stdout).text()
  const stderr = await new Response(proc.stderr).text()

  // Log stderr for debugging (contains all the console.error output)
  if (stderr) {
    console.log('Worker script stderr:', stderr)
  }

  // remove the temporary directory
  fs.rmSync(tempDir, { recursive: true, force: true })

  if (exitCode !== 0) {
    throw new ScriptExecutionError(
      `Failed to execute worker script. Error: ${stderr}`,
      {
        exitCode,
        stderr,
        stdout,
      },
    )
  }

  // Parse the result from stdout
  try {
    const result = JSON.parse(stdout.trim())
    if (!result.success) {
      throw new ScriptExecutionError('Worker script execution failed', {
        error: result.error,
        exitCode,
      })
    }
    return result.response
  } catch (parseError) {
    throw new ScriptExecutionError('Failed to parse worker script result', {
      parseError:
        parseError instanceof Error ? parseError.message : String(parseError),
      stdout,
      stderr,
      exitCode,
    })
  }
}

export class ScriptExecutionError extends Error {
  constructor(
    message: string,
    public readonly details: Record<string, unknown>,
  ) {
    super(message)
  }
}
