import { io } from 'socket.io-client'
import {
  buildAppClient,
  SerializeableResponse,
} from '@stellariscloud/app-worker-sdk'

// Helper function to reconstruct a Request object from serialized data
function reconstructRequest(serializedRequest: any): Request {
  let body: string | undefined = undefined

  // Create a Headers object from the plain object
  const headers = new Headers(serializedRequest.headers)

  // Reconstruct the body based on the original content type
  if (serializedRequest.body !== undefined && serializedRequest.body !== null) {
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

// Override console methods to redirect user script logging to stderr
const originalConsoleLog = console.log
const originalConsoleError = console.error
const originalConsoleWarn = console.warn
const originalConsoleInfo = console.info

// Helper to log to stderr with timestamp
function logToStderr(level: string, ...args: any[]) {
  const timestamp = new Date().toISOString()
  process.stderr.write(
    `[${timestamp}] [${level}] ${args
      .map((arg) =>
        typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg),
      )
      .join(' ')}\n`,
  )
}

// Override console methods to redirect all logging to stderr
console.log = (...args: any[]) => logToStderr('LOG', ...args)
console.error = (...args: any[]) => logToStderr('ERROR', ...args)
console.warn = (...args: any[]) => logToStderr('WARN', ...args)
console.info = (...args: any[]) => logToStderr('INFO', ...args)
;(async () => {
  console.log('process.argv:', process.argv)
  console.log('process.env:', process.env)
  const workerStartContext = JSON.parse(process.argv[2])
  console.log('WORKER START CONTEXT:', workerStartContext)
  let userModule
  try {
    userModule = await import(workerStartContext.scriptPath)
  } catch (err) {
    console.error('Failed to import user script:', err)
    process.exit(1)
  }

  // Try named export first, then default export
  const handleFn =
    workerStartContext.executionType === 'request'
      ? userModule.handleRequest
      : userModule.handleTask
  if (typeof handleFn !== 'function') {
    const result = {
      success: false,
      error: {
        message: `User script does not export a ${workerStartContext.executionType == 'request' ? 'handleRequest' : 'handleTask'} function.`,
      },
    }
    // Use process.stdout.write for structured result (not console.log)
    process.stdout.write(JSON.stringify(result) + '\n')
    process.exit(1)
  }

  try {
    console.log(
      'START SCRIPT EXECUTING !#!#!',
      Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15),
    )
    const socket = io(`${workerStartContext.serverBaseUrl}/apps`, {
      auth: {
        appWorkerId: `worker-script--${workerStartContext.workerIdentifier}--${workerStartContext.executionId}`,
        token: workerStartContext.workerToken,
      },
      reconnection: false,
    })
    const serverClient = buildAppClient(
      socket,
      workerStartContext.serverBaseUrl,
    )

    // Reconstruct the request or task object from serialized data
    const taskOrRequest =
      workerStartContext.executionType === 'request'
        ? reconstructRequest(workerStartContext.request)
        : workerStartContext.task

    const response: SerializeableResponse | undefined =
      (await handleFn(taskOrRequest, { serverClient })) ?? undefined

    console.log(
      'FINISH SCRIPT EXECUTING - RESPONSE (length:%d): %s',
      response?.body.length ?? 0,
      response?.body,
    )

    // Output the structured result to stdout for parent process to capture
    // Use process.stdout.write instead of console.log to avoid our override
    const result = {
      success: true,
      response: response,
    }
    process.stdout.write(JSON.stringify(result) + '\n')

    process.exit(0)
  } catch (err) {
    console.log('Error running user script handler():', err)

    // Output error result to stdout using process.stdout.write
    const result = {
      success: false,
      error: {
        message: err instanceof Error ? err.message : String(err),
        stack: err instanceof Error ? err.stack : undefined,
      },
    }
    process.stdout.write(JSON.stringify(result) + '\n')

    process.exit(1)
  }
})()
