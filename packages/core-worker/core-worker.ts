import type {
  CoreWorkerIncomingRequestMessage,
  CoreWorkerMessagePayloadTypes,
  CoreWorkerOutgoingIpcMessage,
} from '@lombokapp/core-worker-utils'
import {
  coreWorkerIncomingIpcMessageSchema,
  coreWorkerMessagePayloadSchemas,
  coreWorkerOutgoingIpcMessageSchema,
  coreWorkerOutgoingRequestMessageSchema,
  WorkerScriptRuntimeError,
} from '@lombokapp/core-worker-utils'
import { LogEntryLevel } from '@lombokapp/types'
import { log } from 'console'
import crypto from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { analyzeObject } from 'src/handlers/analyze-object-handler'
import { buildAppRequestServer } from 'src/handlers/app-request-server-builder'
import { buildSystemRequestWorker } from 'src/handlers/system-message-worker-builder'
import z from 'zod'

import { buildRunWorkerScriptTaskHandler } from './src/handlers/run-worker-script/run-worker-script-handler'
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
}

process.on('SIGTERM', cleanup)
process.on('SIGINT', cleanup)
process.on('exit', cleanup)

process.stdin.on('close', () => {
  cleanup()
  process.exit(0)
})

const appInstallIdMapping: Record<string, string> = {}
// eslint-disable-next-line @typescript-eslint/require-await
const _log: (...logArgs: unknown[]) => Promise<void> = async (...args) =>
  // eslint-disable-next-line no-console
  console.log(...args)

const updateAppInstallIdMapping = (
  updatedInstallIds: Record<string, string>,
) => {
  Object.keys(updatedInstallIds).forEach((appIdentifier) => {
    // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
    delete appInstallIdMapping[appIdentifier]
  })

  for (const [appIdentifier, appInstallId] of Object.entries(
    updatedInstallIds,
  )) {
    appInstallIdMapping[appIdentifier] = appInstallId
  }
}

const sendIpcMessage = (message: CoreWorkerOutgoingIpcMessage) => {
  try {
    process.stdout.write(`${JSON.stringify(message)}\n`)
  } catch {
    void 0
  }
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
      sendIpcMessage(request)
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
    pending.reject(new Error(response.error.message))
  }
}

const getWorkerExecutionDetails = async (
  payload: CoreWorkerMessagePayloadTypes['get_worker_exec_config']['request'],
) => {
  const response = await sendIpcRequest('get_worker_exec_config', payload)

  if (!response.success) {
    throw new Error(response.error.message)
  }
  const parsedPayload =
    coreWorkerMessagePayloadSchemas.get_worker_exec_config.response.parse(
      response,
    )

  if (!parsedPayload.success) {
    throw new Error(parsedPayload.error.message)
  }

  return parsedPayload.result
}

const getUiBundle = async (
  payload: CoreWorkerMessagePayloadTypes['get_ui_bundle']['request'],
) => {
  const response = await sendIpcRequest('get_ui_bundle', payload)

  if (!response.success) {
    throw new Error(response.error.message)
  }

  const parsedPayload =
    coreWorkerMessagePayloadSchemas.get_ui_bundle.response.parse(response)
  if (!parsedPayload.success) {
    throw new Error(parsedPayload.error.message)
  }

  return parsedPayload.result
}

const handleExecuteTask = async (
  executeTaskPayload: CoreWorkerMessagePayloadTypes['execute_task']['request'],
) => {
  if (!scriptExecutor) {
    throw new Error('Worker executor not initialized')
  }

  const serverlessWorkerDetails = await getWorkerExecutionDetails({
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
) => {
  return analyzeObject(
    analyzeObjectRequestPayload.folderId,
    analyzeObjectRequestPayload.objectKey,
    (getContentSignedUrlArgs) =>
      sendIpcRequest(
        'get_content_signed_urls',
        getContentSignedUrlArgs.requests,
      ).then((response) => {
        if (!response.success) {
          throw new Error(response.error.message)
        }
        return response.result
      }),
    (getMetadataUrlsArgs) =>
      sendIpcRequest('get_metadata_signed_urls', getMetadataUrlsArgs).then(
        (response) => {
          if (!response.success) {
            throw new Error(response.error.message)
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

  updateAppInstallIdMapping(workerData.appInstallIdMapping)

  scriptExecutor = buildRunWorkerScriptTaskHandler(
    executionOptions,
    appInstallIdMapping,
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
      appInstallIdMapping,
      uiBundleCacheWorkerRoot,
      instanceId: workerData.instanceId,
      serverBaseUrl,
      executionOptions,
      getWorkerExecutionDetails,
      getUiBundle,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log({
      message: `HTTP server failed to start: ${message}`,
      level: LogEntryLevel.ERROR,
    })
    try {
      // sendIpcMessage({
      //   type: 'core_worker_status',
      //   status: 'error',
      //   error: message,
      //   instanceId: workerData.instanceId,
      // })
    } catch {
      void 0
    }
    cleanup()
    process.exit(1)
  }

  systemRequestWorker = buildSystemRequestWorker({
    log,
    appInstallIdMapping,
    serverBaseUrl,
    executionOptions,
    getWorkerExecutionDetails,
  })
  return null
}

const handleCoreRequest = async (message: CoreWorkerIncomingRequestMessage) => {
  if (message.action === 'execute_task') {
    await handleExecuteTask(message.payload)
    return null
  } else if (message.action === 'execute_system_request') {
    return handleExecuteSystemRequest(message.payload)
  } else if (message.action === 'init') {
    return handleInit(message.payload)
  } else if (message.action === 'analyze_object') {
    return handleAnalyzeObject(message.payload)
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
  } else if (message.action === 'update_app_install_id_mapping') {
    updateAppInstallIdMapping(message.payload.appInstallIdMapping)
    void _log({
      message: 'App install ID mapping updated',
      level: LogEntryLevel.DEBUG,
      data: {
        appInstallIdMapping: message.payload.appInstallIdMapping,
      },
    })
    return null
  }

  throw new Error(`Unknown core worker request: ${JSON.stringify(message)}`)
}

let stdinBuffer = ''
process.stdin.on('data', (data) => {
  stdinBuffer += data.toString()
  let idx = stdinBuffer.indexOf('\n')
  while (idx !== -1) {
    const line = stdinBuffer.slice(0, idx).trim()
    stdinBuffer = stdinBuffer.slice(idx + 1)
    idx = stdinBuffer.indexOf('\n')

    if (!line) {
      continue
    }

    const rawMessage = JSON.parse(line) as unknown
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
          console.log('responsePayload', responsePayload)
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
          sendIpcMessage(coreWorkerOutgoingIpcMessageSchema.parse(response))
        })
        .catch((error: unknown) => {
          console.log(
            `handleCoreRequest error: ${JSON.stringify(error, null, 2)}`,
          )
          const errorPayload =
            error instanceof WorkerScriptRuntimeError
              ? {
                  code: 'WORKER_SCRIPT_RUNTIME_ERROR',
                  message: error.message,
                  details: error.details,
                }
              : {
                  code: 'WORKER_EXECUTION_ERROR',
                  message: `Failed to handle core request`,
                  details: {
                    action: parsedMessage.data.payload.action,
                    payload: parsedMessage.data.payload.payload,
                    errorMessage:
                      error instanceof Error ? error.message : String(error),
                  },
                }
          sendIpcMessage(
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
      continue
    }
  }
})
