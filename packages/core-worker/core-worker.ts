import { LogEntryLevel } from '@lombokapp/types'
import type { Variant } from '@lombokapp/utils'
import type {
  CoreWorkerIncomingRequestMessage,
  coreWorkerMessagePayloadSchemas,
  CoreWorkerMessagePayloadTypes,
  CoreWorkerOutgoingIpcMessage,
} from '@lombokapp/worker-utils'
import {
  AsyncWorkError,
  buildUnexpectedError,
  coreWorkerIncomingIpcMessageSchema,
  coreWorkerOutgoingIpcMessageSchema,
  coreWorkerOutgoingRequestMessageSchema,
} from '@lombokapp/worker-utils'
import { log } from 'console'
import crypto from 'crypto'
import fs from 'fs'
import type { Socket } from 'net'
import { createConnection } from 'net'
import os from 'os'
import path from 'path'
import { analyzeObject } from 'src/analyze-content-worker/analyze-object-handler'
import { buildAppRequestServer } from 'src/app-workers/app-request-server'
import { buildSystemRequestWorker } from 'src/app-workers/app-system-request-executor'
import z from 'zod'

import { buildRunWorkerScriptTaskHandler } from './src/app-workers/execute-task/app-worker-task-executor'
import { shutdownAllWorkerSandboxes } from './src/worker-scripts/run-worker'

let initialized = false
let serverBaseUrl = ''
let executionOptions: CoreWorkerMessagePayloadTypes['init']['request']['executionOptions'] =
  {
    printWorkerOutput: true,
    removeWorkerDirectory: true,
  }

let scriptExecutor:
  | ReturnType<typeof buildRunWorkerScriptTaskHandler>
  | undefined

let systemRequestWorker: ReturnType<typeof buildSystemRequestWorker> | undefined
let staticAppServer: ReturnType<typeof buildAppRequestServer> | undefined
let ipcSocket: Socket | undefined

const pendingCoreRequests = new Map<
  string,
  {
    resolve: <K extends keyof CoreWorkerMessagePayloadTypes>(
      response: CoreWorkerMessagePayloadTypes[K]['response'],
    ) => void
    reject: (error: Error) => void
    timeout: ReturnType<typeof setTimeout>
  }
>()

const cleanup = () => {
  if (staticAppServer) {
    void staticAppServer.stop()
    staticAppServer = undefined
  }
  void shutdownAllWorkerSandboxes().catch(() => undefined)
  if (ipcSocket) {
    try {
      ipcSocket.destroy()
    } catch {
      void 0
    }
    ipcSocket = undefined
  }
}

process.on('SIGTERM', cleanup)
process.on('SIGINT', cleanup)
process.on('exit', cleanup)

const appUiHashMapping: Record<string, string> = {}
const appWorkerHashMapping: Record<string, string> = {}
// eslint-disable-next-line @typescript-eslint/require-await
const _log: (...logArgs: unknown[]) => Promise<void> = async (...args) =>
  // eslint-disable-next-line no-console
  console.log(...args)

const updateAppHashMapping = (
  updatedUiHashes: Record<string, string>,
  updatedWorkerHashes: Record<string, string>,
) => {
  Object.keys(updatedUiHashes).forEach((appIdentifier) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete appUiHashMapping[appIdentifier]
  })

  for (const [appIdentifier, uiHash] of Object.entries(updatedUiHashes)) {
    appUiHashMapping[appIdentifier] = uiHash
  }

  Object.keys(updatedWorkerHashes).forEach((appIdentifier) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete appWorkerHashMapping[appIdentifier]
  })

  for (const [appIdentifier, workerHash] of Object.entries(
    updatedWorkerHashes,
  )) {
    appWorkerHashMapping[appIdentifier] = workerHash
  }
}

const sendIpcMessage = async (message: CoreWorkerOutgoingIpcMessage) => {
  if (!ipcSocket) {
    throw new Error('IPC socket not available')
  }
  const socket = ipcSocket
  return new Promise<void>((resolve, reject) => {
    const data = `${JSON.stringify(message)}\n`
    socket.write(data, (error?: Error | null) => {
      if (error) {
        reject(error)
      } else {
        resolve()
      }
    })
  })
}

const sendIpcRequest = <K extends keyof CoreWorkerMessagePayloadTypes>(
  action: K,
  payload: CoreWorkerMessagePayloadTypes[K]['request'],
  timeoutMs = 60_000,
): Promise<CoreWorkerMessagePayloadTypes[K]['response']> => {
  const id = crypto.randomUUID()

  const request = z
    .object({
      type: z.literal('request'),
      id: z.string(),
      payload: coreWorkerOutgoingRequestMessageSchema,
    })
    .parse({
      type: 'request',
      id,
      payload: {
        action,
        payload,
      },
    })

  return new Promise<CoreWorkerMessagePayloadTypes[K]['response']>(
    (resolve, reject) => {
      const timeout = setTimeout(() => {
        pendingCoreRequests.delete(id)
        reject(new Error(`Core worker request timed out (${action})`))
      }, timeoutMs)

      pendingCoreRequests.set(id, { resolve, reject, timeout })
      void sendIpcMessage(request)
    },
  )
}

const resolveCoreResponse = <K extends keyof CoreWorkerMessagePayloadTypes>(
  id: string,
  response: CoreWorkerMessagePayloadTypes[K]['response'],
) => {
  const pending = pendingCoreRequests.get(id)
  if (!pending) {
    return
  }
  clearTimeout(pending.timeout)
  pendingCoreRequests.delete(id)
  if (response.success) {
    pending.resolve(response)
  } else {
    pending.reject(new AsyncWorkError(response.error))
  }
}

const getWorkerExecConfig = async (
  payload: CoreWorkerMessagePayloadTypes['get_worker_exec_config']['request'],
) => {
  const response = await sendIpcRequest('get_worker_exec_config', payload)

  if (!response.success) {
    throw new AsyncWorkError(response.error)
  }

  return response.result
}

const getUiBundle = async (
  payload: CoreWorkerMessagePayloadTypes['get_ui_bundle']['request'],
) => {
  const response = await sendIpcRequest('get_ui_bundle', payload)

  if (!response.success) {
    throw new AsyncWorkError(response.error)
  }

  return response.result
}

const handleExecuteTask = async (
  executeTaskPayload: CoreWorkerMessagePayloadTypes['execute_task']['request'],
) => {
  if (!scriptExecutor) {
    throw new Error('Worker executor not initialized')
  }

  const serverlessWorkerDetails = await getWorkerExecConfig({
    appIdentifier: executeTaskPayload.appIdentifier,
    workerIdentifier: executeTaskPayload.workerIdentifier,
  })

  await scriptExecutor({
    task: executeTaskPayload.task,
    appIdentifier: executeTaskPayload.appIdentifier,
    workerIdentifier: executeTaskPayload.workerIdentifier,
    serverlessWorkerDetails,
    onStdoutChunk: executionOptions?.printWorkerOutput
      ? (text) => {
          // eslint-disable-next-line no-console
          console.log(
            `[${executeTaskPayload.appIdentifier}/${executeTaskPayload.workerIdentifier}] ${text.trimEnd()}`,
          )
        }
      : undefined,
  })
}

const handleExecuteSystemRequest = async (
  executeRequestPayload: CoreWorkerMessagePayloadTypes['execute_system_request']['request'],
) => {
  if (!systemRequestWorker) {
    throw new Error('System request worker not initialized')
  }

  const responsePayload = await systemRequestWorker(executeRequestPayload)

  if (!responsePayload) {
    return null
  }

  return responsePayload
}

const handleAnalyzeObject = async (
  analyzeObjectRequestPayload: CoreWorkerMessagePayloadTypes['analyze_object']['request'],
): Promise<
  Variant<
    typeof coreWorkerMessagePayloadSchemas.analyze_object.response,
    'success',
    true
  >['result']
> => {
  return analyzeObject(
    analyzeObjectRequestPayload.folderId,
    analyzeObjectRequestPayload.objectKey,
    async (request) => {
      const response = await sendIpcRequest('get_folder_object', request)
      if (!response.success) {
        throw new AsyncWorkError(response.error)
      }
      return response.result
    },
    (getContentSignedUrlArgs) =>
      sendIpcRequest(
        'get_content_signed_urls',
        getContentSignedUrlArgs.requests,
      ).then((response) => {
        if (!response.success) {
          throw new AsyncWorkError(response.error)
        }
        return response.result
      }),
    (getMetadataUrlsArgs) =>
      sendIpcRequest('get_metadata_signed_urls', getMetadataUrlsArgs).then(
        (response) => {
          if (!response.success) {
            throw new AsyncWorkError(response.error)
          }
          return response.result
        },
      ),
  )
}

const handleInit = (
  workerData: CoreWorkerMessagePayloadTypes['init']['request'],
) => {
  if (initialized) {
    return null
  }

  initialized = true
  serverBaseUrl = workerData.serverBaseUrl ?? 'http://127.0.0.1:3000'
  executionOptions = {
    printWorkerOutput: workerData.executionOptions?.printWorkerOutput ?? true,
    removeWorkerDirectory:
      workerData.executionOptions?.removeWorkerDirectory ?? true,
    printNsjailVerboseOutput:
      workerData.executionOptions?.printNsjailVerboseOutput ?? false,
  }

  updateAppHashMapping(
    workerData.appUiHashMapping,
    workerData.appWorkerHashMapping,
  )

  scriptExecutor = buildRunWorkerScriptTaskHandler(
    executionOptions,
    appWorkerHashMapping,
    serverBaseUrl,
  )

  const uiBundleCacheRoot = path.join(os.tmpdir(), 'lombok-ui-bundle-cache')
  const uiBundleCacheWorkerRoot = path.join(
    uiBundleCacheRoot,
    workerData.instanceId,
  )

  if (fs.existsSync(uiBundleCacheRoot)) {
    console.log('Cleaning previous ui bundle cache directory before starting')
    fs.rmdirSync(uiBundleCacheRoot, { recursive: true })
  }
  fs.mkdirSync(uiBundleCacheWorkerRoot, { recursive: true })

  try {
    staticAppServer = buildAppRequestServer({
      log,
      appUiHashMapping,
      uiBundleCacheWorkerRoot,
      instanceId: workerData.instanceId,
      serverBaseUrl,
      executionOptions,
      getWorkerExecConfig,
      getUiBundle,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log({
      message: `HTTP server failed to start: ${message}`,
      level: LogEntryLevel.ERROR,
    })
    cleanup()
    process.exit(1)
  }

  systemRequestWorker = buildSystemRequestWorker({
    log,
    appWorkerHashMapping,
    serverBaseUrl,
    executionOptions,
    getWorkerExecConfig,
  })
  return null
}

const handleCoreRequest = async (message: CoreWorkerIncomingRequestMessage) => {
  try {
    if (message.action === 'execute_task') {
      await handleExecuteTask(message.payload)
      return null
    } else if (message.action === 'execute_system_request') {
      return await handleExecuteSystemRequest(message.payload)
    } else if (message.action === 'init') {
      return handleInit(message.payload)
    } else if (message.action === 'analyze_object') {
      return await handleAnalyzeObject(message.payload)
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (message.action === 'update_app_hash_mapping') {
      updateAppHashMapping(
        message.payload.appUiHashMapping,
        message.payload.appWorkerHashMapping,
      )
      void _log({
        message: 'App hash mapping updated',
        level: LogEntryLevel.DEBUG,
        data: {
          appUiHashMapping: message.payload.appUiHashMapping,
          appWorkerHashMapping: message.payload.appWorkerHashMapping,
        },
      })
      return null
    }
  } catch (error) {
    if (error instanceof AsyncWorkError) {
      throw error
    }
    throw buildUnexpectedError({
      code: 'UNEXPECTED_ERROR_DURING_CORE_REQUEST_HANDLING',
      message: 'Unexpected error during core reuqest handling',
      error,
      details: {
        action: message.action,
      },
    })
  }

  throw new Error(`Unknown core worker request: ${JSON.stringify(message)}`)
}

// Connect to IPC socket and handle messages
const socketPath = process.env.LOMBOK_CORE_WORKER_SOCKET_PATH
if (!socketPath) {
  console.error('LOMBOK_CORE_WORKER_SOCKET_PATH environment variable not set')
  process.exit(1)
}

let socketBuffer = ''
ipcSocket = createConnection(socketPath, () => {
  // Socket connected
})

ipcSocket.on('data', (data: Buffer) => {
  socketBuffer += data.toString()
  let idx = socketBuffer.indexOf('\n')
  while (idx !== -1) {
    const line = socketBuffer.slice(0, idx).trim()
    socketBuffer = socketBuffer.slice(idx + 1)
    idx = socketBuffer.indexOf('\n')

    if (!line) {
      continue
    }

    let rawMessage: unknown
    try {
      rawMessage = JSON.parse(line)
    } catch {
      // Invalid JSON, ignore
      continue
    }

    const parsedMessage =
      coreWorkerIncomingIpcMessageSchema.safeParse(rawMessage)

    if (!parsedMessage.success) {
      continue
    }

    if (parsedMessage.data.type === 'response') {
      resolveCoreResponse(
        parsedMessage.data.id,
        parsedMessage.data.payload.payload,
      )
      // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    } else if (parsedMessage.data.type === 'request') {
      void handleCoreRequest(parsedMessage.data.payload)
        .then((responsePayload) => {
          const response = {
            type: 'response',
            id: parsedMessage.data.id,
            payload: {
              action: parsedMessage.data.payload.action,
              payload: {
                success: true,
                result: responsePayload,
              },
            },
          }
          void sendIpcMessage(
            coreWorkerOutgoingIpcMessageSchema.parse(response),
          )
        })
        .catch((_error: unknown) => {
          const normalizedError =
            _error instanceof Error ? _error : new Error(String(_error))
          const errorPayload =
            normalizedError instanceof AsyncWorkError
              ? normalizedError.toEnvelope()
              : buildUnexpectedError({
                  code: 'UNEXPECTED_ERROR_DURING_IPC_MESSAGE_HANDLING',
                  message: `Unexpected error during core worker handling of "${parsedMessage.data.payload.action}" request: ${normalizedError.message}`,
                  error: normalizedError,
                  details: {
                    action: parsedMessage.data.payload.action,
                  },
                }).toEnvelope()
          void sendIpcMessage(
            coreWorkerOutgoingIpcMessageSchema.parse({
              type: 'response',
              id: parsedMessage.data.id,
              payload: {
                action: parsedMessage.data.payload.action,
                payload: {
                  success: false,
                  error: errorPayload,
                },
              },
            }),
          )
        })
    }
  }
})

ipcSocket.on('error', (error: Error) => {
  console.error('IPC socket error:', error.message)
  cleanup()
  process.exit(1)
})

ipcSocket.on('close', () => {
  cleanup()
  process.exit(0)
})
