import type {
  AppTask,
  RequestHandler,
  SerializeableRequest,
  SerializeableResponse,
  TaskHandler,
} from '@lombokapp/app-worker-sdk'
import { buildAppClient, buildDatabaseClient } from '@lombokapp/app-worker-sdk'
import type { WorkerModuleStartContext } from '@lombokapp/core-worker'
import {
  serializeWorkerError,
  WorkerError,
  WorkerExecutorError,
  WorkerInvalidError,
  WorkerRuntimeError,
} from '@lombokapp/core-worker'
import type { paths } from '@lombokapp/types'
import fs from 'fs'
import createFetchClient from 'openapi-fetch'
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
    await fs.promises.appendFile(
      workerModuleStartContext.outputLogFilepath,
      output,
    )
  }

  // Timing helper functions
  const getElapsedTime = () => {
    return Date.now() - workerModuleStartContext.startTimestamp
  }

  const logTiming = (
    phase: string,
    additionalData?: Record<string, unknown>,
  ) => {
    const elapsed = getElapsedTime()
    const timingData = {
      phase,
      elapsedMs: Math.round(elapsed * 100) / 100, // Round to 2 decimal places
      ...additionalData,
    }
    originalConsoleLog(`[TIMING] ${JSON.stringify(timingData)}\n`)
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

  logTiming('worker_wrapper_started', {
    executionType: workerModuleStartContext.executionType,
    workerIdentifier: workerModuleStartContext.workerIdentifier,
    executionId: workerModuleStartContext.executionId,
  })

  originalConsoleLog('process.env:', process.env)
  originalConsoleLog('Worker module start context:', workerModuleStartContext)

  let userModule: {
    handleRequest?: RequestHandler
    handleTask?: TaskHandler
  }

  logTiming('module_import_start')
  try {
    userModule = (await import(workerModuleStartContext.scriptPath)) as {
      handleRequest?: RequestHandler
      handleTask?: TaskHandler
    }
    logTiming('module_import_complete')
  } catch (err) {
    logTiming('module_import_failed', {
      error: err instanceof Error ? err.message : String(err),
    })
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
    logTiming('socket_connection_start')
    const socket = io(`${workerModuleStartContext.serverBaseUrl}/apps`, {
      auth: {
        appWorkerId: `worker-script--${workerModuleStartContext.workerIdentifier}--${workerModuleStartContext.executionId}`,
        token: workerModuleStartContext.workerToken,
      },
      reconnection: false,
    })
    logTiming('socket_connection_complete')

    logTiming('client_setup_start')
    const serverClient = buildAppClient(
      socket,
      workerModuleStartContext.serverBaseUrl,
    )

    const dbClient = buildDatabaseClient(serverClient)
    logTiming('client_setup_complete')

    // Reconstruct the request or task object from serialized data
    const taskOrRequest =
      workerModuleStartContext.executionType === 'request'
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          reconstructRequest(workerModuleStartContext.request!)
        : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          workerModuleStartContext.task!

    // For requests, authenticate the user if Authorization header is present
    let userId: string | undefined
    let accessToken: string | undefined
    if (workerModuleStartContext.executionType === 'request') {
      logTiming('authentication_start')
      try {
        const request = taskOrRequest as Request
        const authHeader = request.headers.get('Authorization')

        if (authHeader?.startsWith('Bearer ')) {
          const token = authHeader.slice('Bearer '.length)
          const host = request.headers.get('host') || ''
          const hostParts = host.split('.')

          if (hostParts.length >= 2 && hostParts[1] === 'apps') {
            const appIdentifier = hostParts[0] || ''

            const authResult = await serverClient.authenticateUser(
              token,
              appIdentifier,
            )

            if (authResult.error || !authResult.result.success) {
              logTiming('authentication_failed', {
                error: authResult.error?.message || 'Invalid token',
                appIdentifier,
              })
              throw new WorkerRuntimeError(
                'Authentication failed',
                new Error(authResult.error?.message || 'Invalid token'),
              )
            }

            userId = authResult.result.userId
            accessToken = token
            logTiming('authentication_complete', { userId, appIdentifier })
            console.log(
              `Authenticated user: ${userId} for app: ${appIdentifier}`,
            )
          } else {
            logTiming('authentication_skipped', {
              reason: 'invalid_host_format',
            })
          }
        } else {
          logTiming('authentication_skipped', { reason: 'no_auth_header' })
        }
      } catch (err) {
        logTiming('authentication_error', {
          error: err instanceof Error ? err.message : String(err),
        })
        throw new WorkerRuntimeError(
          'Authentication error',
          err instanceof Error ? err : new Error(String(err)),
        )
      }
    } else {
      logTiming('authentication_skipped', { reason: 'task_execution' })
    }

    let response: SerializeableResponse | undefined
    logTiming('execution_start', {
      executionType: workerModuleStartContext.executionType,
      hasUserId: !!userId,
    })
    try {
      response = await (workerModuleStartContext.executionType === 'request'
        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          userModule.handleRequest!(taskOrRequest as Request, {
            serverClient,
            dbClient,
            user: userId // Pass the authenticated user to the handler
              ? {
                  userId,
                  userApiClient: createFetchClient<paths>({
                    baseUrl: workerModuleStartContext.serverBaseUrl,
                    fetch: async (request) => {
                      const headers = new Headers(request.headers)
                      headers.set('Authorization', `Bearer ${accessToken}`)
                      return fetch(new Request(request, { headers }))
                    },
                  }),
                }
              : undefined,
          })
        : // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
          userModule.handleTask!(taskOrRequest as AppTask, {
            serverClient,
            dbClient,
          }))
      logTiming('execution_complete', { hasResponse: !!response })
    } catch (err) {
      logTiming('execution_failed', {
        error: err instanceof Error ? err.message : String(err),
      })
      throw new WorkerRuntimeError(
        'Worker module error during execution',
        err instanceof Error ? err : new Error(String(err)),
      )
    }

    if (response) {
      logTiming('result_write_start')
      await Bun.file(workerModuleStartContext.resultFilepath).write(
        JSON.stringify(response),
      )
      logTiming('result_write_complete')
    }

    logTiming('worker_completion', {
      totalExecutionTime: getElapsedTime(),
      success: true,
    })
    process.exit(0)
  } catch (err) {
    logTiming('worker_error', {
      error: err instanceof Error ? err.message : String(err),
      errorType: err instanceof WorkerError ? err.constructor.name : 'Unknown',
      totalExecutionTime: getElapsedTime(),
      success: false,
    })

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
