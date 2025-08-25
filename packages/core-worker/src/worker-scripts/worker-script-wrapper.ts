import { appendFile } from 'node:fs/promises'

import type {
  AppTask,
  RequestHandler,
  SerializeableRequest,
  SerializeableResponse,
  TaskHandler,
} from '@lombokapp/app-worker-sdk'
import { buildAppClient } from '@lombokapp/app-worker-sdk'
import type { WorkerModuleStartContext } from '@lombokapp/core-worker'
import {
  serializeWorkerError,
  WorkerError,
  WorkerExecutorError,
  WorkerInvalidError,
  WorkerRuntimeError,
} from '@lombokapp/core-worker'
import { io } from 'socket.io-client'
void (async () => {
  // Helper function to reconstruct a Request object from serialized data
  function reconstructRequest(
    serializeableRequest: SerializeableRequest,
  ): Request {
    let body: string | undefined = undefined

    // Create a Headers object from the plain object
    const headers = new Headers(serializeableRequest.headers)

    // Reconstruct the body based on the original content type
    if (serializeableRequest.body.length) {
      const contentType = headers.get('Content-Type') || ''

      if (contentType.includes('application/json')) {
        // Body was parsed as JSON, convert back to JSON string
        body =
          typeof serializeableRequest.body === 'string'
            ? serializeableRequest.body
            : JSON.stringify(serializeableRequest.body)
      } else if (
        contentType.includes('text/') ||
        contentType.includes('application/x-www-form-urlencoded')
      ) {
        // Body was parsed as text or form data, use as string
        body =
          typeof serializeableRequest.body === 'string'
            ? serializeableRequest.body
            : typeof serializeableRequest.body === 'object'
              ? new URLSearchParams(serializeableRequest.body).toString()
              : String(serializeableRequest.body)
      } else {
        // Default: convert to string
        body = String(serializeableRequest.body)
      }
    }

    return new Request(serializeableRequest.url, {
      method: serializeableRequest.method,
      headers,
      body,
    })
  }

  // Override console methods to redirect all script logging to stdout
  const originalConsoleLog = console.log
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const originalConsoleError = console.error
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const originalConsoleWarn = console.warn
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const originalConsoleInfo = console.info

  const workerModuleStartContext = JSON.parse(
    process.argv[2],
  ) as WorkerModuleStartContext

  const writeErr = async (output: string) => {
    await Bun.file(workerModuleStartContext.errorLogFilepath).write(output)
  }
  const writeOutput = async (output: string) => {
    await appendFile(workerModuleStartContext.outputLogFilepath, output)
  }

  // Helper to log to stderr with timestamp
  function logToStdout(level: string, ...args: unknown[]) {
    const timestamp = new Date().toISOString()
    void writeOutput(
      `[${timestamp}] [${level}] ${args
        .map((arg) =>
          // eslint-disable-next-line @typescript-eslint/no-base-to-string
          typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg),
        )
        .join(' ')}\n`,
    )
  }
  // Override console methods to redirect all logging
  console.log = (...args: unknown[]) => logToStdout('LOG', ...args)
  console.error = (...args: unknown[]) => logToStdout('ERROR', ...args)
  console.warn = (...args: unknown[]) => logToStdout('WARN', ...args)
  console.info = (...args: unknown[]) => logToStdout('INFO', ...args)

  originalConsoleLog('process.env:', process.env)
  originalConsoleLog('Worker module start context:', workerModuleStartContext)
  let userModule: {
    handleRequest?: RequestHandler
    handleTask?: TaskHandler
  }
  try {
    userModule = (await import(workerModuleStartContext.scriptPath)) as {
      handleRequest?: RequestHandler
      handleTask?: TaskHandler
    }
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
    const errorMessage = `App worker module does not export a ${workerModuleStartContext.executionType === 'request' ? 'handleRequest' : 'handleTask'} function`
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
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          reconstructRequest(workerModuleStartContext.request!)
        : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          workerModuleStartContext.task!

    let response: SerializeableResponse | undefined
    try {
      response = await (workerModuleStartContext.executionType === 'request'
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          userModule.handleRequest!(taskOrRequest as Request, { serverClient })
        : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          userModule.handleTask!(taskOrRequest as AppTask, { serverClient }))
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
    const serializedError = serializeWorkerError(
      err instanceof WorkerError
        ? (err.innerError ?? err)
        : new WorkerExecutorError(
            'Internal server error executing worker',
            err instanceof Error ? err : new Error(String(err)),
          ),
    )
    await writeErr(serializedError)
    process.exit(1)
  }
})()
