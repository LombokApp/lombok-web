import type {
  CreateDbFn,
  RequestHandler,
  SerializeableRequest,
  TaskHandler,
} from '@lombokapp/app-worker-sdk'
import {
  buildAppClient,
  buildDatabaseClient,
  createDrizzle,
} from '@lombokapp/app-worker-sdk'
import type {
  WorkerModuleStartContext,
  WorkerPipeRequest,
  WorkerPipeResponse,
} from '@lombokapp/core-worker-utils'
import {
  serializeWorkerError,
  WorkerError,
  WorkerExecutorError,
  WorkerInvalidError,
  WorkerRuntimeError,
} from '@lombokapp/core-worker-utils'
import type { paths, TaskDTO } from '@lombokapp/types'
import { AsyncLocalStorage } from 'async_hooks'
import fs from 'fs'
import createFetchClient from 'openapi-fetch'
import { io } from 'socket.io-client'

import { PipeReader, PipeWriter } from './pipe-utils'

void (async () => {
  // AsyncLocalStorage for request-scoped context
  interface RequestContext {
    requestId: string
    outputLogFilepath: string
    errorLogFilepath: string
    responseWriter: PipeWriter
  }

  const requestContext = new AsyncLocalStorage<RequestContext>()

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

  const workerModuleStartContext = JSON.parse(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.argv[2]!,
  ) as WorkerModuleStartContext

  const writeOutput = async (output: string) => {
    await fs.promises.appendFile(
      workerModuleStartContext.outputLogFilepath,
      output,
    )
  }

  // Global console override that routes to request context or daemon-level logs
  const createConsoleOverride = (level: string) => {
    return (...args: unknown[]) => {
      const ctx = requestContext.getStore()

      if (ctx) {
        // Request-scoped logging
        const timestamp = new Date().toISOString()
        const formatted = args
          .map((a) => {
            if (typeof a === 'string') {
              return a
            }
            if (
              typeof a === 'number' ||
              typeof a === 'boolean' ||
              typeof a === 'bigint' ||
              a === null ||
              a === undefined
            ) {
              return String(a)
            }
            try {
              return JSON.stringify(a, null, 2)
            } catch {
              return '[Unserializable]'
            }
          })
          .join(' ')
        const line = `[${timestamp}] [${level}] ${formatted}\n`

        // Write to per-request log file
        void fs.promises
          .appendFile(ctx.outputLogFilepath, line)
          .catch(() => void 0)

        // Emit to host via pipe for live streaming
        void ctx.responseWriter
          .writeStdoutChunk(ctx.requestId, line)
          .catch(() => void 0)
      } else {
        // Daemon-level logging
        const timestamp = new Date().toISOString()
        const line = `[${timestamp}] [${level}] ${args
          .map((arg) =>
            typeof arg === 'object'
              ? JSON.stringify(arg, null, 2)
              : // eslint-disable-next-line @typescript-eslint/no-base-to-string
                String(arg),
          )
          .join(' ')}\n`
        void writeOutput(line)
      }
    }
  }

  // Install global console overrides
  console.log = createConsoleOverride('LOG')
  console.error = createConsoleOverride('ERROR')
  console.warn = createConsoleOverride('WARN')
  console.info = createConsoleOverride('INFO')

  // Timing helper functions
  const getElapsedTime = (startTime: number) => {
    return Date.now() - startTime
  }

  const logTiming = (
    phase: string,
    startTime: number,
    additionalData?: Record<string, unknown>,
  ) => {
    const elapsed = getElapsedTime(startTime)
    const timingData = {
      phase,
      elapsedMs: Math.round(elapsed * 100) / 100, // Round to 2 decimal places
      executionId: workerModuleStartContext.executionId,
      ...additionalData,
    }
    originalConsoleLog(`[TIMING] ${JSON.stringify(timingData)}\n`)
  }

  // Concurrency configuration
  const MAX_CONCURRENCY = parseInt(process.env.MAX_CONCURRENCY || '10', 10)

  // Semaphore for limiting concurrent requests
  class Semaphore {
    private permits: number
    private readonly waitingQueue: (() => void)[] = []

    constructor(permits: number) {
      this.permits = permits
    }

    async acquire(): Promise<void> {
      if (this.permits > 0) {
        this.permits--
        return Promise.resolve()
      }

      return new Promise<void>((resolve) => {
        this.waitingQueue.push(resolve)
      })
    }

    release(): void {
      if (this.waitingQueue.length > 0) {
        const next = this.waitingQueue.shift()
        if (next) {
          next()
        }
      } else {
        this.permits++
      }
    }
  }

  const concurrencySemaphore = new Semaphore(MAX_CONCURRENCY)

  const daemonStartTime = Date.now()
  logTiming('worker_daemon_started', daemonStartTime, {
    workerIdentifier: workerModuleStartContext.workerIdentifier,
    executionId: workerModuleStartContext.executionId,
    maxConcurrency: MAX_CONCURRENCY,
  })

  originalConsoleLog('process.env:', process.env)
  originalConsoleLog('Worker daemon start context:', workerModuleStartContext)

  let userModule: {
    handleRequest?: RequestHandler
    handleTask?: TaskHandler
  }

  const moduleImportStartTime = Date.now()
  logTiming('module_import_start', moduleImportStartTime)
  try {
    userModule = (await import(workerModuleStartContext.scriptPath)) as {
      handleRequest?: RequestHandler
      handleTask?: TaskHandler
    }
    logTiming('module_import_complete', moduleImportStartTime)
  } catch (err) {
    logTiming('module_import_failed', moduleImportStartTime, {
      error: err instanceof Error ? err.message : String(err),
    })
    throw new WorkerRuntimeError(
      'Error during worker module import',
      err instanceof Error ? err : new Error(String(err)),
    )
  }

  // Verify at least one handler exists - specific handlers will be checked when needed
  if (
    typeof userModule.handleRequest !== 'function' &&
    typeof userModule.handleTask !== 'function'
  ) {
    throw new WorkerInvalidError(
      'App worker module must export either a handleRequest or handleTask function',
    )
  }

  // Function to handle a single request within ALS context
  const handleRequest = async (
    pipeRequest: WorkerPipeRequest,
    serverClient: ReturnType<typeof buildAppClient>,
    dbClient: ReturnType<typeof buildDatabaseClient>,
    responseWriter: PipeWriter,
  ): Promise<void> => {
    const requestStartTime = Date.now()
    logTiming('waiting_for_request', requestStartTime)

    logTiming('received_request', requestStartTime, {
      requestId: pipeRequest.id,
      requestType: pipeRequest.type,
    })

    // Set up request context for ALS
    const ctx: RequestContext = {
      requestId: pipeRequest.id,
      outputLogFilepath:
        pipeRequest.outputLogFilepath ||
        workerModuleStartContext.outputLogFilepath,
      errorLogFilepath:
        pipeRequest.errorLogFilepath ||
        workerModuleStartContext.errorLogFilepath,
      responseWriter,
    }

    const createDb: CreateDbFn = (schema) => createDrizzle(serverClient, schema)

    // Process the request within ALS context
    await requestContext.run(ctx, async () => {
      let response: Response | undefined
      const executionStartTime = Date.now()

      try {
        // Ensure user module is loaded before processing
        if (pipeRequest.type === 'request') {
          const request = reconstructRequest(
            pipeRequest.data as SerializeableRequest,
          )

          // Authenticate the user if Authorization header is present
          let userId: string | undefined
          let accessToken: string | undefined

          const authStartTime = Date.now()
          logTiming('authentication_start', authStartTime, {
            requestId: pipeRequest.id,
          })

          try {
            const authHeader = request.headers.get('Authorization')

            if (
              authHeader?.startsWith('Bearer ') &&
              pipeRequest.appIdentifier
            ) {
              const token = authHeader.slice('Bearer '.length)

              const authResult = await serverClient.authenticateUser({
                token,
                appIdentifier: pipeRequest.appIdentifier,
              })

              if ('error' in authResult) {
                const errorMessage = authResult.error.message
                logTiming('authentication_failed', authStartTime, {
                  requestId: pipeRequest.id,
                  error: errorMessage,
                  appIdentifier: pipeRequest.appIdentifier,
                })
                throw new WorkerRuntimeError(
                  'Authentication failed',
                  new Error(errorMessage),
                )
              }

              userId = authResult.result.userId
              accessToken = token
              logTiming('authentication_complete', authStartTime, {
                requestId: pipeRequest.id,
                userId,
                appIdentifier: pipeRequest.appIdentifier,
              })
              console.log(
                `Authenticated user: ${userId} for app: ${pipeRequest.appIdentifier}`,
              )
            } else {
              logTiming('authentication_skipped', authStartTime, {
                requestId: pipeRequest.id,
                reason: authHeader ? 'no_app_identifier' : 'no_auth_header',
              })
            }
          } catch (err) {
            logTiming('authentication_error', authStartTime, {
              requestId: pipeRequest.id,
              error: err instanceof Error ? err.message : String(err),
            })
            throw new WorkerRuntimeError(
              'Authentication error',
              err instanceof Error ? err : new Error(String(err)),
            )
          }

          logTiming('execution_start', executionStartTime, {
            requestId: pipeRequest.id,
            executionType: 'request',
            hasUserId: !!userId,
          })

          if (typeof userModule.handleRequest !== 'function') {
            throw new WorkerInvalidError(
              'App worker module does not export a handleRequest function',
            )
          }

          response = await userModule.handleRequest(request, {
            serverClient,
            dbClient,
            createDb,
            actor: userId // Pass the authenticated user to the handler
              ? {
                  actorType: 'user',
                  userId,
                  userApiClient: createFetchClient<paths>({
                    baseUrl: workerModuleStartContext.serverBaseUrl,
                    fetch: async (fetchRequest) => {
                      const headers = new Headers(fetchRequest.headers)
                      headers.set('Authorization', `Bearer ${accessToken}`)
                      return fetch(new Request(fetchRequest, { headers }))
                    },
                  }),
                }
              : undefined,
          })
        } else {
          // Handle task
          logTiming('execution_start', executionStartTime, {
            requestId: pipeRequest.id,
            executionType: 'task',
          })

          if (typeof userModule.handleTask !== 'function') {
            throw new WorkerInvalidError(
              'App worker module does not export a handleTask function',
            )
          }

          await userModule.handleTask(pipeRequest.data as TaskDTO, {
            serverClient,
            dbClient,
            createDb,
          })
          // Tasks don't return responses
          response = undefined
        }

        // const responseLength = response ? JSON.stringify(response).length : 0
        logTiming('execution_complete', executionStartTime, {
          requestId: pipeRequest.id,
        })

        // Send successful response
        const pipeResponse: WorkerPipeResponse = {
          id: pipeRequest.id,
          timestamp: Date.now(),
          success: true,
          response,
        }

        await responseWriter.writeResponse(pipeResponse)

        logTiming('response_sent', requestStartTime, {
          requestId: pipeRequest.id,
          totalRequestTime: getElapsedTime(requestStartTime),
        })
      } catch (err) {
        logTiming('execution_failed', executionStartTime, {
          requestId: pipeRequest.id,
          error: err instanceof Error ? err.message : String(err),
        })

        // Send error response
        const pipeResponse: WorkerPipeResponse = {
          id: pipeRequest.id,
          timestamp: Date.now(),
          success: false,
          error: {
            name: err instanceof Error ? err.name : 'Error',
            message: err instanceof Error ? err.message : String(err),
            stack: err instanceof Error ? err.stack : undefined,
          },
        }

        await responseWriter.writeResponse(pipeResponse)

        // Also write error file to per-request path
        try {
          const serialized = serializeWorkerError(
            err instanceof WorkerError
              ? (err.innerError ?? err)
              : new WorkerExecutorError(
                  'Worker handler error',
                  err instanceof Error ? err : new Error(String(err)),
                ),
          )
          await fs.promises.writeFile(ctx.errorLogFilepath, serialized)
        } catch {
          void 0
        }

        // Emit one more stdout chunk with error summary for visibility
        try {
          await responseWriter.writeStdoutChunk(
            pipeRequest.id,
            `[ERROR_SUMMARY] ${err instanceof Error ? err.name + ': ' + err.message : String(err)}\n`,
          )
        } catch {
          void 0
        }

        logTiming('error_response_sent', requestStartTime, {
          requestId: pipeRequest.id,
          totalRequestTime: getElapsedTime(requestStartTime),
        })
      } finally {
        // Ensure a newline to separate requests
        try {
          await responseWriter.writeStdoutChunk(pipeRequest.id, '\n')
        } catch {
          void 0
        }
      }
    })
  }

  // Declare pipes outside try block for proper cleanup
  let requestReader: PipeReader | null = null
  let responseWriter: PipeWriter | null = null

  try {
    const socketStartTime = Date.now()
    logTiming('socket_connection_start', socketStartTime)
    const socket = io(`${workerModuleStartContext.serverBaseUrl}/apps`, {
      auth: {
        appWorkerId: `worker-daemon--${workerModuleStartContext.workerIdentifier}--${workerModuleStartContext.executionId}`,
        token: workerModuleStartContext.workerToken,
      },
      reconnection: false,
    })

    // Wait for socket connection to be established
    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('Socket connection timeout'))
      }, 10000) // 10 second timeout

      socket.on('connect', () => {
        clearTimeout(timeout)
        resolve()
      })

      socket.on('connect_error', (error) => {
        clearTimeout(timeout)
        reject(error)
      })
    })
    logTiming('socket_connection_complete', socketStartTime)

    const clientSetupStartTime = Date.now()
    logTiming('client_setup_start', clientSetupStartTime)
    const serverClient = buildAppClient(
      socket,
      workerModuleStartContext.serverBaseUrl,
    )

    const dbClient = buildDatabaseClient(serverClient)
    logTiming('client_setup_complete', clientSetupStartTime)

    // Create pipe readers and writers
    requestReader = new PipeReader(workerModuleStartContext.requestPipePath)
    responseWriter = new PipeWriter(workerModuleStartContext.responsePipePath)

    // Mark daemon as ready
    console.log('Worker daemon ready, waiting for requests...')

    // Main event loop - handle multiple requests concurrently
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      try {
        const requestStartTime = Date.now()
        logTiming('waiting_for_request', requestStartTime)
        const pipeRequest: WorkerPipeRequest = await requestReader.readRequest()

        // Dispatch request to concurrent handler (non-blocking)
        void (async () => {
          try {
            await concurrencySemaphore.acquire()
            await handleRequest(
              pipeRequest,
              serverClient,
              dbClient,
              responseWriter,
            )
          } catch (error) {
            console.error(`Error handling request ${pipeRequest.id}:`, error)

            // Send error response for dispatch-level errors
            try {
              const errorResponse: WorkerPipeResponse = {
                id: pipeRequest.id,
                timestamp: Date.now(),
                success: false,
                error: {
                  name: 'DispatchError',
                  message:
                    error instanceof Error ? error.message : String(error),
                  stack: error instanceof Error ? error.stack : undefined,
                },
              }
              await responseWriter.writeResponse(errorResponse)
            } catch (writeError) {
              console.error('Failed to write error response:', writeError)
            }
          } finally {
            concurrencySemaphore.release()
          }
        })()
      } catch (pipeError) {
        // Error reading from pipe
        console.error('Pipe communication error:', pipeError)

        // Check if this is a shutdown signal
        if (
          pipeError instanceof Error &&
          pipeError.message.includes('Pipe closed')
        ) {
          console.log('Pipe closed, shutting down worker daemon...')
          break
        }

        // For other pipe errors, continue trying to read
        console.log('Continuing to wait for requests...')
      }
    }

    // Clean up pipes
    await requestReader.close()
    await responseWriter.close()

    logTiming('worker_daemon_shutdown', daemonStartTime, {
      totalDaemonTime: getElapsedTime(daemonStartTime),
      success: true,
    })

    process.exit(0)
  } catch (err) {
    // Clean up pipes on error
    if (requestReader) {
      try {
        await requestReader.close()
      } catch (closeError) {
        // eslint-disable-next-line no-console
        console.error('Failed to close request reader:', closeError)
      }
    }
    if (responseWriter) {
      try {
        await responseWriter.close()
      } catch (closeError) {
        // eslint-disable-next-line no-console
        console.error('Failed to close response writer:', closeError)
      }
    }

    logTiming('worker_daemon_error', daemonStartTime, {
      error: err instanceof Error ? err.message : String(err),
      errorType: err instanceof WorkerError ? err.constructor.name : 'Unknown',
      totalDaemonTime: getElapsedTime(daemonStartTime),
      success: false,
    })

    // Output error result to stderr
    const serializedError = serializeWorkerError(
      err instanceof WorkerError
        ? (err.innerError ?? err)
        : new WorkerExecutorError(
            'Internal server error executing worker daemon',
            err instanceof Error ? err : new Error(String(err)),
          ),
    )

    try {
      await fs.promises.writeFile(
        workerModuleStartContext.errorLogFilepath,
        serializedError,
      )
    } catch (writeError) {
      console.error('Failed to write error log:', writeError)
    }

    process.exit(1)
  }
})()
