import type {
  AppTask,
  RequestHandler,
  SerializeableRequest,
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

import { PipeReader, PipeWriter } from './pipe-utils'
import type { WorkerPipeRequest, WorkerPipeResponse } from './types'

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

  const workerModuleStartContext = JSON.parse(
    process.argv[2],
  ) as WorkerModuleStartContext

  const writeOutput = async (output: string) => {
    await fs.promises.appendFile(
      workerModuleStartContext.outputLogFilepath,
      output,
    )
  }

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

  const daemonStartTime = Date.now()
  logTiming('worker_daemon_started', daemonStartTime, {
    workerIdentifier: workerModuleStartContext.workerIdentifier,
    executionId: workerModuleStartContext.executionId,
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

    console.log('Worker daemon ready, waiting for requests...')

    // Main event loop - handle multiple requests
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    while (true) {
      try {
        const requestStartTime = Date.now()
        logTiming('waiting_for_request', requestStartTime)
        const pipeRequest: WorkerPipeRequest = await requestReader.readRequest()

        logTiming('received_request', requestStartTime, {
          requestId: pipeRequest.id,
          requestType: pipeRequest.type,
        })

        // Process the request
        let response: Response | undefined
        const executionStartTime = Date.now()

        // Prepare restore holders available to finally
        const restore = {
          log: console.log,
          error: console.error,
          warn: console.warn,
          info: console.info,
        }

        try {
          // Configure per-request logging: override console to write to per-request paths
          const perRequestOutputPath =
            pipeRequest.outputLogFilepath ||
            workerModuleStartContext.outputLogFilepath

          const appendLine = async (level: string, args: unknown[]) => {
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
            try {
              await fs.promises.appendFile(perRequestOutputPath, line)
            } catch {
              void 0
            }
            // best effort: also emit to host via pipe for live streaming
            try {
              await responseWriter?.writeStdoutChunk(pipeRequest.id, line)
            } catch {
              void 0
            }
          }
          console.log = (...args: unknown[]) => void appendLine('LOG', args)
          console.error = (...args: unknown[]) => void appendLine('ERROR', args)
          console.warn = (...args: unknown[]) => void appendLine('WARN', args)
          console.info = (...args: unknown[]) => void appendLine('INFO', args)
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

                const authResult = await serverClient.authenticateUser(
                  token,
                  pipeRequest.appIdentifier,
                )

                if (authResult.error || !authResult.result.success) {
                  logTiming('authentication_failed', authStartTime, {
                    requestId: pipeRequest.id,
                    error: authResult.error?.message || 'Invalid token',
                    appIdentifier: pipeRequest.appIdentifier,
                  })
                  throw new WorkerRuntimeError(
                    'Authentication failed',
                    new Error(authResult.error?.message || 'Invalid token'),
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
              user: userId // Pass the authenticated user to the handler
                ? {
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
            console.log(
              'response outside handleRequest:',
              response,
              typeof response,
            )
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

            await userModule.handleTask(pipeRequest.data as AppTask, {
              serverClient,
              dbClient,
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
            const perRequestErrorPath =
              pipeRequest.errorLogFilepath ||
              workerModuleStartContext.errorLogFilepath
            await fs.promises.writeFile(perRequestErrorPath, serialized)
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
          // Restore console overrides to daemon-level behavior
          console.log = restore.log
          console.error = restore.error
          console.warn = restore.warn
          console.info = restore.info
          // Ensure a newline to separate requests
          try {
            await responseWriter.writeStdoutChunk(pipeRequest.id, '\n')
          } catch {
            void 0
          }
        }
      } catch (pipeError) {
        // Error reading from pipe or writing response
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
