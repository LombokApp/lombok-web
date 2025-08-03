import { io } from 'socket.io-client'
import {
  buildAppClient,
  SerializeableResponse,
} from '@stellariscloud/app-worker-sdk'
import {
  WorkerError,
  WorkerExecutorError,
  WorkerInvalidError,
  WorkerModuleStartContext,
  WorkerRuntimeError,
  serializeError,
} from '@stellariscloud/core-worker'
;(async () => {
  // Helper function to reconstruct a Request object from serialized data
  function reconstructRequest(serializedRequest: any): Request {
    let body: string | undefined = undefined

    // Create a Headers object from the plain object
    const headers = new Headers(serializedRequest.headers)

    // Reconstruct the body based on the original content type
    if (
      serializedRequest.body !== undefined &&
      serializedRequest.body !== null
    ) {
      const contentType = headers.get('Content-Type') || ''

      if (contentType.includes('application/json')) {
        // Body was parsed as JSON, convert back to JSON string
        body =
          typeof serializedRequest.body === 'string'
            ? serializedRequest.body
            : JSON.stringify(serializedRequest.body)
      } else if (
        contentType.includes('text/') ||
        contentType.includes('application/x-www-form-urlencoded')
      ) {
        // Body was parsed as text or form data, use as string
        body =
          typeof serializedRequest.body === 'string'
            ? serializedRequest.body
            : typeof serializedRequest.body === 'object'
              ? new URLSearchParams(serializedRequest.body).toString()
              : String(serializedRequest.body)
      } else {
        // Default: convert to string
        body = String(serializedRequest.body)
      }
    }

    return new Request(serializedRequest.url, {
      method: serializedRequest.method,
      headers: headers,
      body: body,
    })
  }

  // Override console methods to redirect all script logging to stdout
  const originalConsoleLog = console.log
  const originalConsoleError = console.error
  const originalConsoleWarn = console.warn
  const originalConsoleInfo = console.info

  const workerModuleStartContext = JSON.parse(
    process.argv[2],
  ) as WorkerModuleStartContext

  const writeErr = async (output: string) => {
    await Bun.file(workerModuleStartContext.errorLogFilepath).write(output)
  }
  const writeOutput = async (output: string) => {
    await Bun.file(workerModuleStartContext.outputLogFilepath).write(output)
  }

  // Helper to log to stderr with timestamp
  function logToStdout(level: string, ...args: any[]) {
    const timestamp = new Date().toISOString()
    void writeOutput(
      `[${timestamp}] [${level}] ${args
        .map((arg) =>
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg),
        )
        .join(' ')}\n`,
    )
  }
  // Override console methods to redirect all logging to stderr
  console.log = (...args: any[]) => logToStdout('LOG', ...args)
  console.error = (...args: any[]) => logToStdout('ERROR', ...args)
  console.warn = (...args: any[]) => logToStdout('WARN', ...args)
  console.info = (...args: any[]) => logToStdout('INFO', ...args)

  originalConsoleLog('process.env:', process.env)
  originalConsoleLog('Worker module start context:', workerModuleStartContext)
  let userModule
  try {
    userModule = await import(workerModuleStartContext.scriptPath)
  } catch (err) {
    throw new WorkerRuntimeError(
      'Error during worker module import',
      err instanceof Error ? err : new Error(String(err)),
    )
  }

  // Try named export first, then default export
  const handleFn =
    workerModuleStartContext.executionType === 'request'
      ? userModule.handleRequest
      : userModule.handleTask
  if (typeof handleFn !== 'function') {
    const errorMessage = `App worker module does not export a ${workerModuleStartContext.executionType == 'request' ? 'handleRequest' : 'handleTask'} function`
    throw new WorkerInvalidError(errorMessage)
  }

  try {
    const socket = io(`${workerModuleStartContext.serverBaseUrl}/apps`, {
      auth: {
        appWorkerId: `worker-script--${workerModuleStartContext.workerIdentifier}--${workerModuleStartContext.executionId}`,
        token: workerModuleStartContext.workerToken,
      },
      reconnection: false,
    })

    const serverClient = buildAppClient(
      socket,
      workerModuleStartContext.serverBaseUrl,
    )

    // Reconstruct the request or task object from serialized data
    const taskOrRequest =
      workerModuleStartContext.executionType === 'request'
        ? reconstructRequest(workerModuleStartContext.request)
        : workerModuleStartContext.task

    let response: SerializeableResponse | undefined
    try {
      response = (await handleFn(taskOrRequest, { serverClient })) ?? undefined
    } catch (err) {
      throw new WorkerRuntimeError(
        'Worker module error during execution',
        err instanceof Error ? err : new Error(String(err)),
      )
    }

    if (response) {
      await Bun.file(workerModuleStartContext.resultFilepath).write(
        JSON.stringify(response),
      )
    }

    process.exit(0)
  } catch (err) {
    // Output error result to stdout using process.stdout.write
    const serializedError = serializeError(
      err instanceof WorkerError
        ? err
        : new WorkerExecutorError(
            'Internal server error executing worker',
            err instanceof Error ? err : new Error(String(err)),
          ),
    )
    await writeErr(serializedError)
    process.exit(1)
  }
})()
