import type {
  CreateDbFn,
  RequestHandler,
  SerializeableRequest,
  TaskHandler,
} from '@lombokapp/app-worker-sdk'
import {
  AppTaskError,
  buildAppClient,
  createLombokAppPgDatabaseForClient,
  LombokAppPgClient,
  verifyAppToken,
} from '@lombokapp/app-worker-sdk'
import type { JsonSerializableObject, paths, TaskDTO } from '@lombokapp/types'
import type {
  WorkerModuleStartContext,
  WorkerRequest,
  WorkerResponse,
} from '@lombokapp/worker-utils'
import {
  AsyncWorkDispatchError,
  AsyncWorkError,
  buildUnexpectedError,
} from '@lombokapp/worker-utils'
import { AsyncLocalStorage } from 'async_hooks'
import fs from 'fs'
import createFetchClient from 'openapi-fetch'
import { io } from 'socket.io-client'

import { getAsyncWorkErrorFromAppTaskError } from './app-error-utils'
import { setBaseLogContext, workerLogger } from './logger'
import {
  connectToHostSocket,
  type SocketReader,
  type SocketWriter,
} from './socket-utils'

void (async () => {
  // AsyncLocalStorage for request-scoped context
  interface RequestContext {
    requestId: string
    outputLogFilepath: string
    errorLogFilepath: string
    responseWriter: SocketWriter
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

    return new Request(
      `http://${headers.get('host')}${serializeableRequest.url}`,
      {
        method: serializeableRequest.method,
        headers,
        body,
      },
    )
  }

  // Keep the original console.log for escape hatches that truly must bypass
  // our override (currently unused — workerLogger is the preferred entry point).
  const originalConsoleLog = console.log
  void originalConsoleLog

  const workerModuleStartContext = JSON.parse(
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    process.argv[2]!,
  ) as WorkerModuleStartContext

  setBaseLogContext({
    app: workerModuleStartContext.appIdentifier,
    worker: workerModuleStartContext.workerIdentifier,
    executionId: workerModuleStartContext.executionId,
  })

  const writeOutput = async (output: string) => {
    await fs.promises.appendFile(
      workerModuleStartContext.outputLogFilepath,
      output,
    )
  }

  const formatArg = (a: unknown): string => {
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_e) {
      return '[Unserializable]'
    }
  }

  // Map user console.* calls to workerLogger `user` channel.
  // Request-scoped: also mirror to per-request log file + stdout_chunk stream
  // so the host can surface live output to API callers.
  const createConsoleOverride = (
    level: 'info' | 'warn' | 'error' | 'debug',
    tag: 'LOG' | 'ERROR' | 'WARN' | 'INFO',
  ) => {
    return (...args: unknown[]) => {
      const ctx = requestContext.getStore()
      const msg = args.map(formatArg).join(' ')

      if (ctx) {
        const timestamp = new Date().toISOString()
        const line = `[${timestamp}] [${tag}] ${msg}\n`
        void fs.promises
          .appendFile(ctx.outputLogFilepath, line)
          .catch(() => void 0)
        workerLogger[level]('user', msg, { reqId: ctx.requestId })
      } else {
        const timestamp = new Date().toISOString()
        void writeOutput(`[${timestamp}] [${tag}] ${msg}\n`)
        workerLogger[level]('user', msg)
      }
    }
  }

  // Install global console overrides
  console.log = createConsoleOverride('info', 'LOG')
  console.error = createConsoleOverride('error', 'ERROR')
  console.warn = createConsoleOverride('warn', 'WARN')
  console.info = createConsoleOverride('info', 'INFO')
  console.debug = createConsoleOverride('debug', 'LOG')

  // Timing helper functions
  const getElapsedTime = (startTime: number) => {
    return Date.now() - startTime
  }

  const logTiming = (
    phase: string,
    startTime: number,
    additionalData?: Record<string, unknown>,
  ) => {
    if (!workerLogger.enabled('timing', 'debug')) {
      return
    }
    workerLogger.debug('timing', phase, {
      elapsedMs: Math.round(getElapsedTime(startTime) * 100) / 100,
      ...additionalData,
    })
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

  workerLogger.debug('daemon', 'env snapshot', { env: process.env })
  workerLogger.info('daemon', 'start', { context: workerModuleStartContext })

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
    const error = err instanceof Error ? err : new Error(String(err))
    throw new AsyncWorkError({
      origin: 'app',
      name: 'AppWorkerModuleImportError',
      message: 'Error during app worker module import',
      code: 'APP_WORKER_MODULE_IMPORT_ERROR',
      cause: {
        name: 'AppWorkerModuleImportError',
        origin: 'app',
        code: 'APP_WORKER_MODULE_IMPORT_ERROR',
        message: error.message,
        ...(error.stack ? { stack: error.stack } : {}),
      },
    })
  }

  // Verify at least one handler exists - specific handlers will be checked when needed
  if (
    typeof userModule.handleRequest !== 'function' &&
    typeof userModule.handleTask !== 'function'
  ) {
    throw new AsyncWorkError({
      name: 'AppWorkerModuleInvalid',
      origin: 'app',
      message:
        'App worker module must export either a handleRequest or handleTask function',
      code: 'APP_WORKER_MODULE_MISSING_HANDLERS',
    })
  }

  // Function to handle a single request within ALS context
  const handleRequest = async (
    pipeRequest: WorkerRequest,
    serverClient: ReturnType<typeof buildAppClient>,
    dbClient: LombokAppPgClient,
    responseWriter: SocketWriter,
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

    // Share the daemon's pool; a per-request client leaked a pool each call.
    const createDb: CreateDbFn = (schema) =>
      createLombokAppPgDatabaseForClient(dbClient, schema)

    // Process the request within ALS context
    await requestContext.run(ctx, async () => {
      let response: Response | undefined
      const executionStartTime = Date.now()
      let httpMeta: { method: string; path: string } | undefined
      let taskMeta:
        | {
            taskIdentifier: string
            invocationKind?: string
          }
        | undefined

      try {
        // Ensure user module is loaded before processing
        if (pipeRequest.type === 'request') {
          const request = reconstructRequest(
            pipeRequest.data as SerializeableRequest,
          )
          try {
            const u = new URL(request.url)
            httpMeta = { method: request.method, path: u.pathname + u.search }
          } catch {
            httpMeta = { method: request.method, path: request.url }
          }

          // Authenticate the user if Authorization header is present
          let userId: string | undefined
          let accessToken: string | undefined
          let actorExtra: JsonSerializableObject | undefined
          let actor: Parameters<RequestHandler>[1]['actor']

          const authStartTime = Date.now()
          logTiming('authentication_start', authStartTime, {
            requestId: pipeRequest.id,
          })

          try {
            if (pipeRequest.isSystemRequest) {
              actor = { actorType: 'system' }
              logTiming('authentication_skipped', authStartTime, {
                requestId: pipeRequest.id,
                reason: 'system_request',
              })
            } else {
              const authHeader = request.headers.get('Authorization')
              if (workerLogger.enabled('http', 'debug')) {
                workerLogger.debug('http', 'request headers', {
                  reqId: pipeRequest.id,
                  headers: request.headers.toJSON(),
                })
              }
              if (
                authHeader?.startsWith('Bearer ') &&
                pipeRequest.appIdentifier
              ) {
                const token = authHeader.slice('Bearer '.length)
                const publicKeyPem = process.env.LOMBOK_APP_JWT_PUBLIC_KEY
                if (!publicKeyPem) {
                  throw new AsyncWorkError({
                    name: 'AuthenticationFailed',
                    origin: 'platform',
                    message:
                      'LOMBOK_APP_JWT_PUBLIC_KEY env var not set; cannot verify app tokens',
                    code: 'WORKER_REQUEST_AUTHENTICATION_FAILED',
                    stack: new Error().stack,
                    details: {
                      id: pipeRequest.id,
                      timestamp: pipeRequest.timestamp,
                    },
                  })
                }

                let claims: Awaited<ReturnType<typeof verifyAppToken>>
                try {
                  claims = await verifyAppToken(token, { publicKeyPem })
                } catch (err) {
                  const errorMessage =
                    err instanceof Error ? err.message : String(err)
                  logTiming('authentication_failed', authStartTime, {
                    requestId: pipeRequest.id,
                    error: errorMessage,
                  })
                  throw new AsyncWorkError({
                    name: 'AuthenticationFailed',
                    origin: 'platform',
                    message: errorMessage,
                    code: 'WORKER_REQUEST_AUTHENTICATION_FAILED',
                    stack: new Error().stack,
                    details: {
                      id: pipeRequest.id,
                      timestamp: pipeRequest.timestamp,
                      request: {
                        url: request.url,
                        method: request.method,
                      },
                      isSystemRequest: pipeRequest.isSystemRequest,
                    },
                  })
                }

                if (claims.actorType !== 'app_user') {
                  throw new AsyncWorkError({
                    name: 'AuthenticationFailed',
                    origin: 'platform',
                    message: `Token actor "${claims.actorType}" is not allowed for worker requests`,
                    code: 'WORKER_REQUEST_AUTHENTICATION_FAILED',
                    stack: new Error().stack,
                    details: {
                      id: pipeRequest.id,
                      timestamp: pipeRequest.timestamp,
                    },
                  })
                }
                if (claims.appIdentifier !== pipeRequest.appIdentifier) {
                  throw new AsyncWorkError({
                    name: 'AuthenticationFailed',
                    origin: 'platform',
                    message: 'Token app identifier mismatch',
                    code: 'WORKER_REQUEST_AUTHENTICATION_FAILED',
                    stack: new Error().stack,
                    details: {
                      id: pipeRequest.id,
                      timestamp: pipeRequest.timestamp,
                    },
                  })
                }

                userId = claims.userId
                accessToken = token
                actorExtra = claims.extra
                actor = {
                  userId,
                  actorType: 'app_user',
                  platformAccess: claims.platformAccess,
                  ...(claims.worker !== undefined
                    ? { worker: claims.worker }
                    : {}),
                  userApiClient: createFetchClient<paths>({
                    baseUrl: workerModuleStartContext.serverBaseUrl,
                    fetch: async (fetchRequest) => {
                      const headers = new Headers(fetchRequest.headers)
                      headers.set('Authorization', `Bearer ${accessToken}`)
                      return fetch(new Request(fetchRequest, { headers }))
                    },
                  }),
                  extra: actorExtra ?? {},
                }
                logTiming('authentication_complete', authStartTime, {
                  requestId: pipeRequest.id,
                  userId,
                  appIdentifier: pipeRequest.appIdentifier,
                })
                workerLogger.debug('http', 'authenticated', {
                  reqId: pipeRequest.id,
                  userId,
                  appIdentifier: pipeRequest.appIdentifier,
                  actor: claims.actorType,
                })
              } else {
                logTiming('authentication_skipped', authStartTime, {
                  requestId: pipeRequest.id,
                  reason: authHeader ? 'no_app_identifier' : 'no_auth_header',
                })
              }
            }
          } catch (err) {
            logTiming('authentication_error', authStartTime, {
              requestId: pipeRequest.id,
              error: err instanceof Error ? err.message : String(err),
            })
            if (err instanceof AsyncWorkError) {
              throw err
            }

            const error = err instanceof Error ? err : new Error(String(err))

            throw new AsyncWorkError({
              origin: 'platform',
              name: 'UnknownAuthenticationError',
              message: 'Unknown authentication error',
              code: 'WORKER_REQUEST_AUTHENTICATION_FAILED',
              stack: error.stack,
              details: {
                id: pipeRequest.id,
                timestamp: pipeRequest.timestamp,
                request: {
                  url: request.url,
                  method: request.method,
                },
                isSystemRequest: pipeRequest.isSystemRequest,
              },
              cause: new AsyncWorkError({
                origin: 'platform',
                name: 'UnknownAuthenticationError',
                code: 'UNKNOWN_AUTHENTICATION_ERROR',
                message: 'Unknown authentication error',
                stack: error.stack,
                details: {
                  id: pipeRequest.id,
                  timestamp: pipeRequest.timestamp,
                  original: {
                    name: error.name,
                    message: error.message,
                  },
                },
              }),
            })
          }

          logTiming('execution_start', executionStartTime, {
            requestId: pipeRequest.id,
            executionType: 'request',
            hasUserId: !!userId,
          })

          if (typeof userModule.handleRequest !== 'function') {
            throw new AsyncWorkError({
              origin: 'app',
              name: 'InvalidAppWorkerModule',
              message:
                'App worker module does not export a handleRequest function',
              code: 'INVALID_APP_WORKER_MODULE',
            })
          }

          try {
            response = await userModule.handleRequest(request, {
              serverClient,
              dbClient,
              createDb,
              actor,
            })
          } catch (err) {
            if (err instanceof AppTaskError) {
              throw err
            }
            throw buildUnexpectedError({
              isAppError: true,
              code: 'UNEXPECTED_ERROR_DURING_REQUEST_HANDLER_EXECUTION',
              message: 'Unexpected error during request handler execution',
              error: err,
            })
          }
        } else {
          // Handle task
          const taskData = pipeRequest.data as TaskDTO
          taskMeta = {
            taskIdentifier: taskData.taskIdentifier,
            invocationKind: taskData.invocation.kind,
          }
          workerLogger.debug('task', 'started', {
            reqId: pipeRequest.id,
            taskIdentifier: taskMeta.taskIdentifier,
            invocation: taskMeta.invocationKind,
          })
          logTiming('execution_start', executionStartTime, {
            requestId: pipeRequest.id,
            executionType: 'task',
          })

          if (typeof userModule.handleTask !== 'function') {
            throw new AsyncWorkError({
              origin: 'app',
              name: 'InvalidAppWorkerModule',
              message:
                'App worker module does not export a handleTask function',
              code: 'INVALID_APP_WORKER_MODULE',
            })
          }

          try {
            await userModule.handleTask(taskData, {
              serverClient,
              dbClient,
              createDb,
            })
          } catch (err) {
            if (err instanceof AppTaskError) {
              throw err
            }
            throw buildUnexpectedError({
              isAppError: true,
              code: 'UNEXPECTED_ERROR_DURING_TASK_HANDLER_EXECUTION',
              message: 'Unexpected error during task handler execution',
              error: err,
            })
          }

          // Tasks don't return responses
          response = undefined
        }

        // const responseLength = response ? JSON.stringify(response).length : 0
        logTiming('execution_complete', executionStartTime, {
          requestId: pipeRequest.id,
        })

        // Send successful response
        const pipeResponse: WorkerResponse = {
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

        if (httpMeta) {
          const status = response?.status ?? 200
          const ms = getElapsedTime(requestStartTime)
          const level: 'info' | 'warn' | 'error' =
            status >= 500 ? 'error' : status >= 400 ? 'warn' : 'info'
          workerLogger[level]('http', 'request', {
            reqId: pipeRequest.id,
            method: httpMeta.method,
            path: httpMeta.path,
            status,
            ms,
          })
        }

        if (taskMeta) {
          workerLogger.info('task', 'completed', {
            reqId: pipeRequest.id,
            taskIdentifier: taskMeta.taskIdentifier,
            invocation: taskMeta.invocationKind,
            ms: getElapsedTime(requestStartTime),
          })
        }
      } catch (err) {
        const normalizedError =
          err instanceof Error ? err : new Error(String(err))
        logTiming('execution_failed', executionStartTime, {
          requestId: pipeRequest.id,
          error: normalizedError,
        })

        // Send error response
        const pipeResponse: WorkerResponse = {
          id: pipeRequest.id,
          timestamp: Date.now(),
          success: false,
          error:
            normalizedError instanceof AppTaskError
              ? getAsyncWorkErrorFromAppTaskError(
                  normalizedError,
                  new Error().stack,
                ).toEnvelope()
              : normalizedError instanceof AsyncWorkError
                ? normalizedError.toEnvelope()
                : buildUnexpectedError({
                    code:
                      pipeRequest.type === 'request'
                        ? 'UNEXPECTED_ERROR_DURING_REQUEST_HANDLER_EXECUTION'
                        : 'UNEXPECTED_ERROR_DURING_TASK_HANDLER_EXECUTION',
                    message:
                      pipeRequest.type === 'request'
                        ? 'Unexpected error during request handler execution'
                        : 'Unexpected error during task handler execution',
                    error: normalizedError,
                    details: {
                      id: pipeRequest.id,
                      timestamp: pipeRequest.timestamp,
                      requestType: pipeRequest.type,
                      ...(pipeRequest.type === 'request'
                        ? { isSystemRequest: pipeRequest.isSystemRequest }
                        : {}),
                    },
                  }).toEnvelope(),
        }

        await responseWriter.writeResponse(pipeResponse)

        logTiming('error_response_sent', requestStartTime, {
          requestId: pipeRequest.id,
          totalRequestTime: getElapsedTime(requestStartTime),
        })

        if (httpMeta) {
          workerLogger.error('http', 'request', {
            reqId: pipeRequest.id,
            method: httpMeta.method,
            path: httpMeta.path,
            status: 500,
            ms: getElapsedTime(requestStartTime),
            error: normalizedError.name + ': ' + normalizedError.message,
          })
        }

        if (taskMeta) {
          workerLogger.error('task', 'failed', {
            reqId: pipeRequest.id,
            taskIdentifier: taskMeta.taskIdentifier,
            invocation: taskMeta.invocationKind,
            ms: getElapsedTime(requestStartTime),
            error: normalizedError.name + ': ' + normalizedError.message,
          })
        }
      }
    })
  }

  // Declare socket reader/writer outside try block for proper cleanup
  let requestReader: SocketReader | null = null
  let responseWriter: SocketWriter | null = null

  try {
    const socketStartTime = Date.now()
    logTiming('socket_connection_start', socketStartTime)
    const socket = io(`${workerModuleStartContext.serverBaseUrl}/apps`, {
      auth: {
        instanceId: `worker-daemon--${workerModuleStartContext.workerIdentifier}--${workerModuleStartContext.executionId}`,
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

    const dbClient = new LombokAppPgClient(serverClient)
    logTiming('client_setup_complete', clientSetupStartTime)

    // Connect to host's Unix domain socket for bidirectional communication
    // The host creates the socket server before spawning this daemon, so we can connect immediately
    logTiming('connecting_to_host_socket', Date.now())
    const { reader, writer } = await connectToHostSocket(
      workerModuleStartContext.socketPath,
    )
    requestReader = reader
    responseWriter = writer
    logTiming('host_socket_connected', Date.now())

    // Mark daemon as ready
    workerLogger.info('daemon', 'ready, waiting for requests')

    // Main event loop - handle multiple requests concurrently
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      try {
        const requestStartTime = Date.now()
        logTiming('waiting_for_request_in_loop', requestStartTime)
        const pipeRequest = await requestReader.readRequest()
        if (!pipeRequest) {
          workerLogger.info('daemon', 'shutdown requested by host')
          break
        }
        logTiming('read_maybe_request', Date.now(), {
          request: pipeRequest,
        })

        // Dispatch request to concurrent handler (non-blocking)
        void (async () => {
          try {
            logTiming('acquiring_worker_lock', Date.now())
            await concurrencySemaphore.acquire()
            logTiming('acquired_worker_lock', Date.now())
            await handleRequest(
              pipeRequest,
              serverClient,
              dbClient,
              responseWriter,
            )
            logTiming('handled_request', Date.now())
          } catch (error) {
            workerLogger.error('daemon', 'error handling request', {
              reqId: pipeRequest.id,
              error: error instanceof Error ? error.message : String(error),
            })

            // Send error response for dispatch-level errors
            try {
              const errorResponse: WorkerResponse = {
                id: pipeRequest.id,
                timestamp: Date.now(),
                success: false,
                error: new AsyncWorkDispatchError({
                  name: 'AsyncWorkDispatchError',
                  message: 'Error dispatching request',
                  cause: {
                    name: 'AsyncWorkDispatchError',
                    origin: 'platform',
                    code: 'DISPATCH_ERROR',
                    message:
                      error instanceof Error ? error.message : String(error),
                    stack:
                      error instanceof Error ? error.stack : new Error().stack,
                  },
                }).toEnvelope(),
              }
              await responseWriter.writeResponse(errorResponse)
            } catch (writeError) {
              logTiming('write_error', Date.now(), {
                message: 'Failed to write error response',
                error: writeError,
              })
            }
          } finally {
            concurrencySemaphore.release()
            logTiming('worker_lock_released', Date.now())
          }
        })()
      } catch (pipeError) {
        // Error reading from pipe
        logTiming('pipe_communication_error', Date.now(), { error: pipeError })

        // Check if this is a shutdown signal
        if (
          pipeError instanceof Error &&
          pipeError.message.includes('Pipe closed')
        ) {
          workerLogger.info('daemon', 'pipe closed, shutting down')
          break
        }

        // For other pipe errors, continue trying to read
        workerLogger.warn('daemon', 'pipe error, continuing to wait', {
          error:
            pipeError instanceof Error ? pipeError.message : String(pipeError),
        })
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
        workerLogger.error('daemon', 'failed to close request reader', {
          error:
            closeError instanceof Error
              ? closeError.message
              : String(closeError),
        })
      }
    }
    if (responseWriter) {
      try {
        await responseWriter.close()
      } catch (closeError) {
        workerLogger.error('daemon', 'failed to close response writer', {
          error:
            closeError instanceof Error
              ? closeError.message
              : String(closeError),
        })
      }
    }

    logTiming('worker_daemon_error', daemonStartTime, {
      error: err instanceof Error ? err.message : String(err),
      errorType: err instanceof Error ? err.constructor.name : 'Unknown',
      totalDaemonTime: getElapsedTime(daemonStartTime),
      success: false,
    })

    // Output error result to stderr
    const serializedError = JSON.stringify(
      err instanceof AsyncWorkError
        ? err.toEnvelope()
        : new AsyncWorkError({
            name: 'UnexpectedError',
            origin: 'platform',
            code: 'UNEXPECTED_ERROR_DURING_WORKER_EXECUTION',
            message: 'Unexpected error during worker execution',
            stack: new Error().stack,
            cause:
              err instanceof Error
                ? {
                    origin: 'platform',
                    name: 'UnexpectedError',
                    code: 'UNKNOWN_ERROR',
                    message: 'Unknown error',
                    stack: err.stack,
                    details: {
                      name: err.name,
                      message: err.message,
                      stringifiedCause: String(err.cause),
                    },
                  }
                : {
                    origin: 'platform',
                    name: 'UnexpectedError',
                    code: 'THROWN_NON_ERROR',
                    message: 'Non-error object thrown',
                    details: {
                      stringified: String(err),
                    },
                  },
            details: {},
          }).toEnvelope(),
    )

    try {
      await fs.promises.writeFile(
        workerModuleStartContext.errorLogFilepath,
        serializedError,
      )
    } catch (writeError) {
      workerLogger.error('daemon', 'failed to write error log', {
        error:
          writeError instanceof Error ? writeError.message : String(writeError),
      })
    }

    process.exit(1)
  }
})()
