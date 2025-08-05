import type {
  AppTask,
  CoreServerMessageInterface,
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

export const runWorkerScript = async ({
  requestOrTask,
  server,
  appIdentifier,
  workerIdentifier,
  workerExecutionId,
  options: { printWorkerOutput = true, emptyWorkerTmpDir = true } = {
    printWorkerOutput: true,
    emptyWorkerTmpDir: true,
  },
}: {
  server: CoreServerMessageInterface
  requestOrTask: Request | AppTask
  appIdentifier: string
  workerIdentifier: string
  workerExecutionId: string
  options?: {
    printWorkerOutput?: boolean
    emptyWorkerTmpDir?: boolean
  }
}): Promise<SerializeableResponse | undefined> => {
  const isRequest = requestOrTask instanceof Request
  const workerRootPath = path.join(os.tmpdir(), workerExecutionId)
  const inFilepath = path.join(workerRootPath, `worker-module.zip`)
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

  const workerScriptEnvVars = Object.keys(
    workerExecutionDetails.envVars,
  ).reduce<string[]>(
    (acc, next) =>
      acc.concat(
        `WORKER_SCRIPT_VAR_${next.trim()}=${workerExecutionDetails.envVars[next].trim()}`,
      ),
    [],
  )

  console.log(
    'Downloading worker module payload:',
    workerExecutionDetails.payloadUrl,
  )
  await downloadFileToDisk(workerExecutionDetails.payloadUrl, inFilepath)

  const unzipProc = Bun.spawn({
    cmd: ['unzip', inFilepath, '-d', workerRootPath],
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
    path.join(workerRootPath, workerWrapperScript),
  )

  const envVars = workerScriptEnvVars.map((v) => v.trim())

  const entrypoint = fs.existsSync(
    path.join(workerRootPath, workerIdentifier, 'index.js'),
  )
    ? `index.js`
    : `index.ts`

  // Serialize the request or task for the sandbox
  const serializedRequestOrTask = isRequest
    ? {
        url: requestOrTask.url.replace(
          new RegExp(`/worker-api/${workerIdentifier}`),
          '',
        ), // Trim the "/worker-api/${workerIdentifier}" prefix
        method: requestOrTask.method,
        headers: Object.fromEntries(requestOrTask.headers.entries()),
        body: await parseRequestBody(requestOrTask),
        // Add other properties you need from the Request
      }
    : requestOrTask

  const workerModuleStartContext: WorkerModuleStartContext = {
    resultFilepath: resultOutputPath.replace(workerRootPath, ''),
    outputLogFilepath: outLogPath.replace(workerRootPath, ''),
    errorLogFilepath: errOutputPath.replace(workerRootPath, ''),
    scriptPath: `./${workerIdentifier}/${entrypoint}`,
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
      '--tmpfsmount=/tmp',
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
      ...envVars.map((v) => `-E${v}`),
      '-Mo',
      '-v',
      '--',
      '/usr/local/bin/bun',
      `./${workerWrapperScript}`,
      JSON.stringify(workerModuleStartContext),
    ],
    stdout: 'inherit',
    stderr: 'inherit',
  })

  if (emptyWorkerTmpDir && fs.existsSync(workerTmpDir)) {
    console.log('Emptying worker tmp dir:', workerTmpDir)
    fs.rmSync(workerTmpDir, { recursive: true })
  }

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
      const parsedErrObj = JSON.parse(errStr) as SerializeableError | undefined
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
}
