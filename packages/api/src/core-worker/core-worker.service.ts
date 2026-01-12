import {
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  NotImplementedException,
} from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { spawn } from 'child_process'
import crypto from 'crypto'
import { Socket } from 'net'
import { AppService } from 'src/app/services/app.service'
import { coreConfig } from 'src/core/config'
import { transformFolderObjectToDTO } from 'src/folders/dto/transforms/folder-object.transforms'
import { FolderService } from 'src/folders/services/folder.service'
import { OrmService } from 'src/orm/orm.service'
import z from 'zod'

import {
  AppNotFoundError,
  AppWorkerNotFoundError,
  AsyncWorkError,
  AsyncWorkErrorEnvelope,
  buildUnexpectedError,
  CoreWorkerIncomingIpcMessage,
  coreWorkerIncomingIpcMessageSchema,
  coreWorkerIncomingRequestMessageSchema,
  CoreWorkerIncomingResponseMessage,
  CoreWorkerMessagePayloadTypes,
  coreWorkerOutgoingIpcMessageSchema,
  CoreWorkerOutgoingRequestMessage,
  NotReadyAsyncWorkError,
} from '../../../worker-utils/src'
import { SHOULD_START_CORE_WORKER_THREAD_KEY } from './core-worker.constants'
import { createSocketServer, writeSocketMessage } from './socket-utils'

@Injectable()
export class CoreWorkerService {
  private readonly logger = new Logger(CoreWorkerService.name)
  private child: ReturnType<typeof spawn> | undefined
  private serverlessWorkerThreadReady = false
  private ipcSocket: Socket | undefined
  private socketCleanup: (() => void) | undefined
  private readonly pendingRequests = new Map<
    string,
    {
      resolve: <K extends keyof CoreWorkerMessagePayloadTypes>(
        response: CoreWorkerMessagePayloadTypes[K]['response'],
      ) => void
      reject: (error: Error) => void
      timeout: NodeJS.Timeout
    }
  >()
  private readonly appService: AppService
  private readonly folderService: FolderService
  workers: Record<string, Worker | undefined> = {}

  constructor(
    @Inject(SHOULD_START_CORE_WORKER_THREAD_KEY)
    private readonly shouldStartThread: boolean,
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => AppService))
    _appService,
    @Inject(forwardRef(() => FolderService))
    _folderService,
  ) {
    this.appService = _appService as AppService
    this.folderService = _folderService as FolderService
  }

  async getAppHashMapping() {
    const allApps = await this.ormService.db.query.appsTable.findMany({
      columns: {
        identifier: true,
        ui: true,
        runtimeWorkers: true,
      },
    })
    const uiHashMapping: Record<string, string> = {}
    const workerHashMapping: Record<string, string> = {}
    for (const app of allApps) {
      if (app.ui.hash) {
        uiHashMapping[app.identifier] = app.ui.hash
      }
      if (app.runtimeWorkers.hash) {
        workerHashMapping[app.identifier] = app.runtimeWorkers.hash
      }
    }
    return { uiHashMapping, workerHashMapping }
  }

  private getServerBaseUrl() {
    const port = this._coreConfig.platformPort ?? 3000
    const protocol = this._coreConfig.platformHttps ? 'https' : 'http'
    return `${protocol}://127.0.0.1:${port}`
  }

  isReady() {
    return !!this.child && this.serverlessWorkerThreadReady
  }

  private async sendIpcMessage(message: CoreWorkerIncomingIpcMessage) {
    if (!this.ipcSocket) {
      throw new Error('Core worker IPC socket not available')
    }
    await writeSocketMessage(this.ipcSocket, message)
  }

  private sendRequest<K extends keyof CoreWorkerMessagePayloadTypes>(
    action: K,
    payload: CoreWorkerMessagePayloadTypes[K]['request'],
    timeoutMs = 60_000,
  ): Promise<CoreWorkerMessagePayloadTypes[K]['response']> {
    if (!this.ipcSocket) {
      return Promise.reject(new Error('Core worker IPC socket not available'))
    }

    const id = crypto.randomUUID()
    const request = z
      .object({
        type: z.literal('request'),
        id: z.string(),
        payload: coreWorkerIncomingRequestMessageSchema,
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
          this.pendingRequests.delete(id)
          reject(new Error(`Core worker request timed out (${action})`))
        }, timeoutMs)

        this.pendingRequests.set(id, { resolve, reject, timeout })
        void this.sendIpcMessage(request)
      },
    )
  }

  private resolveWorkerResponse<K extends keyof CoreWorkerMessagePayloadTypes>(
    id: string,
    response: CoreWorkerMessagePayloadTypes[K]['response'],
  ) {
    const pending = this.pendingRequests.get(id)
    if (!pending) {
      return
    }
    clearTimeout(pending.timeout)
    this.pendingRequests.delete(id)
    if (response.success) {
      pending.resolve(response)
    } else {
      pending.reject(new AsyncWorkError(response.error))
    }
  }

  private async handleWorkerRequest(
    message: CoreWorkerOutgoingRequestMessage,
  ): Promise<CoreWorkerIncomingResponseMessage['payload']> {
    switch (message.action) {
      case 'get_worker_exec_config': {
        try {
          return await this.appService
            .getWorkerExecConfig({
              appIdentifier: message.payload.appIdentifier,
              workerIdentifier: message.payload.workerIdentifier,
            })
            .then((result) => ({ result, success: true }) as const)
            .catch((error) => {
              throw error
            })
        } catch (error) {
          let errorEnvelope: AsyncWorkErrorEnvelope | undefined
          if (error instanceof NotFoundException) {
            errorEnvelope = new AppNotFoundError({
              name: 'Error',
              message: `Worker "${message.payload.workerIdentifier}" not found for app "${message.payload.appIdentifier}"`,
              details: {
                appIdentifier: message.payload.appIdentifier,
                workerIdentifier: message.payload.workerIdentifier,
              },
            }).toEnvelope()
          } else if (error instanceof NotImplementedException) {
            errorEnvelope = new AppWorkerNotFoundError({
              name: 'Error',
              message: `Worker "${message.payload.workerIdentifier}" not found for app "${message.payload.appIdentifier}"`,
              details: {
                appIdentifier: message.payload.appIdentifier,
                workerIdentifier: message.payload.workerIdentifier,
              },
            }).toEnvelope()
          } else {
            errorEnvelope = buildUnexpectedError({
              code: 'UNEXPECTED_ERROR_GETTING_WORKER_EXEC_CONFIG',
              message: 'Unexpected error getting worker exec config',
              error,
              details: {
                appIdentifier: message.payload.appIdentifier,
                workerIdentifier: message.payload.workerIdentifier,
              },
            }).toEnvelope()
          }
          return {
            success: false,
            error: errorEnvelope,
          } as const
        }
      }
      case 'get_ui_bundle': {
        try {
          return {
            success: true,
            result: await this.appService.getAppUIbundle(
              message.payload.appIdentifier,
            ),
          } as const
        } catch (error) {
          let errorEnvelope: AsyncWorkErrorEnvelope | undefined
          if (error instanceof NotFoundException) {
            errorEnvelope = new AppNotFoundError({
              name: 'Error',
              message: `UI bundle not found for app "${message.payload.appIdentifier}"`,
              details: {
                appIdentifier: message.payload.appIdentifier,
              },
            }).toEnvelope()
          } else if (error instanceof NotImplementedException) {
            errorEnvelope = new AppWorkerNotFoundError({
              name: 'Error',
              message: `UI bundle not found for app "${message.payload.appIdentifier}"`,
              details: {
                appIdentifier: message.payload.appIdentifier,
              },
            }).toEnvelope()
          } else {
            errorEnvelope = buildUnexpectedError({
              code: 'UNEXPECTED_ERROR_GETTING_UI_BUNDLE',
              message: 'Unexpected error getting UI bundle',
              error,
              details: {
                appIdentifier: message.payload.appIdentifier,
              },
            }).toEnvelope()
          }
          return {
            success: false,
            error: errorEnvelope,
          } as const
        }
      }
      case 'get_metadata_signed_urls': {
        return {
          success: true,
          result: await this.appService.createSignedMetadataUrls(
            message.payload,
          ),
        }
      }
      case 'get_folder_object': {
        return this.folderService
          .getFolderObject(message.payload)
          .then(
            (result) =>
              ({
                success: true,
                result: transformFolderObjectToDTO(result),
              }) as const,
          )
          .catch((error) => {
            return {
              success: false,
              error: buildUnexpectedError({
                code: 'UNEXPECTED_ERROR_GETTING_FOLDER_OBJECT',
                message: 'Unexpected error getting folder object',
                error,
              }).toEnvelope(),
            } as const
          })
      }
      case 'get_content_signed_urls': {
        return {
          success: true,
          result: await this.appService.createSignedContentUrls(
            message.payload,
          ),
        }
      }
      default: {
        throw new Error(
          `Unknown core worker request: ${JSON.stringify(message)}`,
        )
      }
    }
  }

  private handleWorkerMessage(line: string, _socket: Socket) {
    let jsonData: unknown
    try {
      jsonData = JSON.parse(line)
    } catch {
      // Line is not valid JSON, ignore
      return
    }

    const parsedMessage = coreWorkerOutgoingIpcMessageSchema.safeParse(jsonData)
    if (!parsedMessage.success) {
      return
    }

    if (parsedMessage.data.type === 'response') {
      this.resolveWorkerResponse(
        parsedMessage.data.id,
        parsedMessage.data.payload.payload,
      )
      return
    }

    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    if (parsedMessage.data.type === 'request') {
      void this.handleWorkerRequest(parsedMessage.data.payload)
        .then((responsePayload) => {
          void this.sendIpcMessage(
            coreWorkerIncomingIpcMessageSchema.parse({
              type: 'response',
              id: parsedMessage.data.id,
              payload: {
                action: parsedMessage.data.payload.action,
                payload: responsePayload,
              },
            }),
          )
        })
        .catch((error: unknown) => {
          const errorPayload =
            error instanceof AsyncWorkError
              ? error.toEnvelope()
              : buildUnexpectedError({
                  code: 'UNEXPECTED_ERROR_DURING_CORE_WORKER_REQUEST_HANDLING',
                  message: `Unknown error during core worker "${parsedMessage.data.payload.action}" request: ${error instanceof Error ? error.message : String(error)}`,
                  error,
                }).toEnvelope()
          void this.sendIpcMessage({
            type: 'response',
            id: parsedMessage.data.id,
            payload: {
              action: parsedMessage.data.payload.action as
                | 'get_worker_exec_config'
                | 'get_ui_bundle',
              payload: {
                success: false,
                error: errorPayload,
              },
            },
          })
        })
    }
  }

  // Ensure spawned worker is terminated when the API process is exiting
  private setupParentShutdownHooks(child: ReturnType<typeof spawn>) {
    const terminate = () => {
      try {
        child.kill()
      } catch {
        void 0
      }
      if (this.socketCleanup) {
        this.socketCleanup()
      }
    }
    process.once('SIGINT', terminate)
    process.once('SIGTERM', terminate)
    process.once('beforeExit', terminate)
    process.once('exit', terminate)
  }

  async startCoreWorkerThread() {
    if (!this.shouldStartThread || this._coreConfig.disableCoreWorker) {
      this.logger.warn('Core worker disabled, skipping thread start')
      return
    }
    const instanceId = `embedded_worker_1_${crypto.randomUUID()}`
    if (!this.workers[instanceId]) {
      this.serverlessWorkerThreadReady = false

      // Create Unix socket for IPC
      const socketPath = `/tmp/lombok-core-worker-${instanceId}.sock`
      const { server, cleanup } = await createSocketServer(
        socketPath,
        (message: string, socket: Socket) => {
          this.handleWorkerMessage(message, socket)
        },
      )
      this.socketCleanup = cleanup

      // Store the socket connection (will be set when client connects)
      server.on('connection', (socket: Socket) => {
        this.ipcSocket = socket
        socket.on('close', () => {
          this.ipcSocket = undefined
        })
      })

      // Resolve the core-worker entry: use src in dev, dist in production
      const isProduction = process.env.NODE_ENV === 'production'
      const workerEntry = isProduction
        ? require.resolve('@lombokapp/core-worker/core-worker')
        : require.resolve('@lombokapp/core-worker/core-worker.ts')
      this.child = spawn('bun', [workerEntry], {
        uid: 1000,
        gid: 1000,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          LOMBOK_CORE_WORKER_SOCKET_PATH: socketPath,
        },
      })
      this.setupParentShutdownHooks(this.child)
      let hasScheduledRetry = false

      this.child.stdout?.on('data', (chunk: Buffer) => {
        if (this._coreConfig.printCoreWorkerOutput) {
          this.logger.debug(`[core-worker stdout] ${chunk.toString()}`)
        }
      })

      this.child.stderr?.on('data', (chunk: Buffer) => {
        if (this._coreConfig.printCoreWorkerOutput) {
          this.logger.error(`[core-worker stderr] ${chunk.toString()}`)
        }
      })

      // If the child exits unexpectedly, schedule a retry
      this.child.on('exit', (code) => {
        this.serverlessWorkerThreadReady = false
        this.ipcSocket = undefined
        if (this.socketCleanup) {
          this.socketCleanup()
          this.socketCleanup = undefined
        }
        if (code && code !== 0) {
          this.logger.warn(
            `Embedded core worker exited with code ${String(code)}. Retrying...`,
          )
          if (!hasScheduledRetry) {
            hasScheduledRetry = true
            setTimeout(() => {
              void this.startCoreWorkerThread()
            }, 1000)
          }
        }
      })
      this.child.on('error', (err) => {
        this.serverlessWorkerThreadReady = false
        this.logger.error(
          `Embedded core worker process error: ${String(err.message)}`,
        )
      })

      setTimeout(() => {
        const executionOptions = {
          printWorkerOutput: this._coreConfig.printCoreWorkerOutput,
          removeWorkerDirectory: this._coreConfig.removeCoreWorkerDirectories,
          printNsjailVerboseOutput:
            this._coreConfig.printCoreWorkerNsjailVerboseOutput,
        }
        const workerDataPayload: CoreWorkerMessagePayloadTypes['init']['request'] =
          {
            appUiHashMapping: {},
            appWorkerHashMapping: {},
            instanceId,
            executionOptions,
            serverBaseUrl: this.getServerBaseUrl(),
          }

        void this.sendRequest('init', workerDataPayload).then(async () => {
          await this.updateAppHashMapping()
          this.serverlessWorkerThreadReady = true
          this.logger.debug(
            `Serverless worker runner thread started with execution options: ${Object.keys(
              workerDataPayload.executionOptions ?? {},
            )
              .map(
                (key) => `${key}=${workerDataPayload.executionOptions?.[key]}`,
              )
              .join(', ')}`,
          )
        })
      }, 500)
    }
  }

  async analyzeObject(
    payload: CoreWorkerMessagePayloadTypes['analyze_object']['request'],
    timeoutMs = 5 * 60_000,
  ) {
    const response = await this.sendRequest(
      'analyze_object',
      payload,
      timeoutMs,
    )
    if (!response.success) {
      throw new AsyncWorkError(response.error)
    }
    await this.folderService.updateFolderObjectMetadata('core', [
      {
        folderId: payload.folderId,
        objectKey: payload.objectKey,
        hash: response.result.contentHash,
        metadata: response.result.contentMetadata,
      },
    ])
    return response.result
  }

  async executeServerlessAppTask(
    payload: CoreWorkerMessagePayloadTypes['execute_task']['request'],
    timeoutMs = 5 * 60_000,
  ) {
    if (!this.isReady()) {
      throw new NotReadyAsyncWorkError({
        name: 'Error',
        code: 'SERVERLESS_EXECUTOR_NOT_READY',
        message: 'Serverless executor not ready to accept workloads',
        requeueDelayMs: 10000,
        stack: new Error().stack,
      })
    }
    return this.sendRequest('execute_task', payload, timeoutMs)
  }

  async executeServerlessRequest(
    payload: CoreWorkerMessagePayloadTypes['execute_system_request']['request'],
    timeoutMs = 3 * 60_000,
  ) {
    if (!this.isReady()) {
      throw new NotReadyAsyncWorkError({
        name: 'Error',
        code: 'SERVERLESS_EXECUTOR_NOT_READY',
        message: 'Serverless executor not ready to accept workloads',
        requeueDelayMs: 10000,
        stack: new Error().stack,
      })
    }
    return this.sendRequest('execute_system_request', payload, timeoutMs)
  }

  async updateAppHashMapping() {
    const { uiHashMapping, workerHashMapping } = await this.getAppHashMapping()
    if (this.ipcSocket) {
      await this.sendRequest('update_app_hash_mapping', {
        appUiHashMapping: uiHashMapping,
        appWorkerHashMapping: workerHashMapping,
      })
    }
  }
}
