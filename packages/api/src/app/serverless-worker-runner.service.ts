import {
  CoreWorkerIncomingIpcMessage,
  coreWorkerIncomingIpcMessageSchema,
  coreWorkerIncomingRequestMessageSchema,
  CoreWorkerIncomingResponseMessage,
  CoreWorkerMessagePayloadTypes,
  coreWorkerOutgoingIpcMessageSchema,
  CoreWorkerOutgoingRequestMessage,
} from '@lombokapp/core-worker-utils'
import {
  ConflictException,
  forwardRef,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { spawn } from 'child_process'
import crypto from 'crypto'
import { AppService } from 'src/app/services/app.service'
import { OrmService } from 'src/orm/orm.service'
import { platformConfig } from 'src/platform/config'
import z from 'zod'

@Injectable()
export class ServerlessWorkerRunnerService {
  private readonly logger = new Logger(ServerlessWorkerRunnerService.name)
  private child: ReturnType<typeof spawn> | undefined
  private serverlessWorkerThreadReady = false
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

  workers: Record<string, Worker | undefined> = {}

  constructor(
    @Inject(platformConfig.KEY)
    private readonly _platformConfig: nestjsConfig.ConfigType<
      typeof platformConfig
    >,
    private readonly ormService: OrmService,
    @Inject(forwardRef(() => AppService))
    _appService,
  ) {
    this.appService = _appService as AppService
  }

  async getAppInstallIdMapping() {
    const allApps = await this.ormService.db.query.appsTable.findMany({
      columns: {
        identifier: true,
        installId: true,
      },
    })
    return allApps.reduce<Record<string, string>>((acc, app) => {
      acc[app.identifier] = app.installId
      return acc
    }, {})
  }

  private getServerBaseUrl() {
    const port = this._platformConfig.platformPort ?? 3000
    const protocol = this._platformConfig.platformHttps ? 'https' : 'http'
    return `${protocol}://127.0.0.1:${port}`
  }

  isReady() {
    return !!this.child && this.serverlessWorkerThreadReady
  }

  private sendIpcMessage(message: CoreWorkerIncomingIpcMessage) {
    if (!this.child?.stdin) {
      throw new Error('Core worker process not available')
    }
    this.child.stdin.write(`${JSON.stringify(message)}\n`)
  }

  private sendRequest<K extends keyof CoreWorkerMessagePayloadTypes>(
    action: K,
    payload: CoreWorkerMessagePayloadTypes[K]['request'],
    timeoutMs = 60_000,
  ): Promise<CoreWorkerMessagePayloadTypes[K]['response']> {
    if (!this.child?.stdin) {
      return Promise.reject(new Error('Core worker process not available'))
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
        this.sendIpcMessage(request)
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
      pending.reject(new Error(response.error.message))
    }
  }

  private async handleWorkerRequest(
    message: CoreWorkerOutgoingRequestMessage,
  ): Promise<CoreWorkerIncomingResponseMessage['payload']> {
    switch (message.action) {
      case 'get_worker_exec_config': {
        try {
          return await this.appService
            .getWorkerExecutionDetails({
              appIdentifier: message.payload.appIdentifier,
              workerIdentifier: message.payload.workerIdentifier,
            })
            .then((result) => ({ result, success: true }) as const)
            .catch((error) => {
              throw error
            })
        } catch (error) {
          if (error instanceof NotFoundException) {
            return {
              success: false,
              error: {
                code: 'WORKER_NOT_FOUND',
                message: error.message,
              },
            } as const
          } else if (error instanceof ConflictException) {
            return {
              success: false,
              error: {
                code: 'WORKER_UNAVAILABLE',
                message: error.message,
              },
            } as const
          }
          return {
            success: false,
            error: {
              code: 'WORKER_UNAVAILABLE',
              message: `Error: ${String(error)}`,
            },
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
          if (error instanceof NotFoundException) {
            return {
              success: false,
              error: {
                code: 'APP_NOT_FOUND',
                message: error.message,
              },
            } as const
          } else if (error instanceof ConflictException) {
            return {
              success: false,
              error: {
                code: 'APP_UNAVAILABLE',
                message: error.message,
              },
            } as const
          }
          return {
            success: false,
            error: {
              code: 'WORKER_UNAVAILABLE',
              message: `Error: ${String(error)}`,
            },
          } as const
        }
      }
      default: {
        throw new Error(
          `Unknown core worker request: ${JSON.stringify(message)}`,
        )
      }
    }
  }

  private handleWorkerMessage(line: string, _instanceId: string) {
    if (!this.child?.stdout || !this.child.stderr) {
      return
    }
    try {
      const parsedMessage = coreWorkerOutgoingIpcMessageSchema.safeParse(
        JSON.parse(line),
      )
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
            this.sendIpcMessage(
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
            this.sendIpcMessage({
              type: 'response',
              id: parsedMessage.data.id,
              payload: {
                action: parsedMessage.data.payload.action as
                  | 'get_worker_exec_config'
                  | 'get_ui_bundle',
                payload: {
                  success: false,
                  error: {
                    code: 'UNKNOWN_ERROR',
                    message:
                      error instanceof Error ? error.message : String(error),
                  },
                },
              },
            })
          })
      }
    } catch {
      void 0
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
    }
    process.once('SIGINT', terminate)
    process.once('SIGTERM', terminate)
    process.once('beforeExit', terminate)
    process.once('exit', terminate)
  }

  async startServerlessWorkerRunnerThread() {
    const instanceId = `embedded_worker_1_${crypto.randomUUID()}`
    if (this._platformConfig.disableEmbeddedCoreAppWorker) {
      this.logger.warn(
        'Serverless worker runner not enabled, skipping thread start',
      )
      return
    }
    if (!this.workers[instanceId]) {
      this.serverlessWorkerThreadReady = false
      // Resolve the core-app-worker entry: use src in dev, dist in production
      const isProduction = process.env.NODE_ENV === 'production'
      const workerEntry = isProduction
        ? require.resolve('@lombokapp/core-worker/core-app-worker')
        : require.resolve('@lombokapp/core-worker/core-app-worker.ts')
      this.child = spawn('bun', [workerEntry], {
        uid: 1000,
        gid: 1000,
        stdio: ['pipe', 'pipe', 'pipe'],
      })
      this.setupParentShutdownHooks(this.child)
      let hasScheduledRetry = false

      let stdoutBuffer = ''
      this.child.stdout?.on('data', (chunk: Buffer) => {
        stdoutBuffer += chunk.toString()
        let idx = stdoutBuffer.indexOf('\n')
        while (idx !== -1) {
          const line = stdoutBuffer.slice(0, idx)
          stdoutBuffer = stdoutBuffer.slice(idx + 1)
          this.handleWorkerMessage(line, instanceId)
          if (this._platformConfig.printEmbeddedCoreAppWorkerOutput) {
            this.logger.debug(`[core-worker stdout] ${line}`)
          }
          idx = stdoutBuffer.indexOf('\n')
        }
      })

      // Also parse error channel for JSON lines if emitted there
      let stderrBuffer = ''
      this.child.stderr?.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString()
        let idx = stderrBuffer.indexOf('\n')
        while (idx !== -1) {
          const line = stderrBuffer.slice(0, idx)
          stderrBuffer = stderrBuffer.slice(idx + 1)
          this.handleWorkerMessage(line, instanceId)
          if (this._platformConfig.printEmbeddedCoreAppWorkerOutput) {
            this.logger.error(`[core-worker stderr] ${line}`)
          }
          idx = stderrBuffer.indexOf('\n')
        }
      })

      // Flush any remaining buffered content on stream end
      this.child.stdout?.on('end', () => {
        if (stdoutBuffer.length > 0) {
          if (this._platformConfig.printEmbeddedCoreAppWorkerOutput) {
            this.logger.debug(`[core-worker stdout] ${stdoutBuffer}`)
          }
          stdoutBuffer = ''
        }
      })
      this.child.stderr?.on('end', () => {
        if (stderrBuffer.length > 0) {
          if (this._platformConfig.printEmbeddedCoreAppWorkerOutput) {
            this.logger.error(`[core-worker stderr] ${stderrBuffer}`)
          }
          stderrBuffer = ''
        }
      })

      // If the child exits unexpectedly, schedule a retry
      this.child.on('exit', (code) => {
        this.serverlessWorkerThreadReady = false
        if (code && code !== 0) {
          this.logger.warn(
            `Embedded core app worker exited with code ${String(code)}. Retrying...`,
          )
          if (!hasScheduledRetry) {
            hasScheduledRetry = true
            setTimeout(() => {
              void this.startServerlessWorkerRunnerThread()
            }, 1000)
          }
        }
      })
      this.child.on('error', (err) => {
        this.serverlessWorkerThreadReady = false
        this.logger.error(
          `Embedded core app worker process error: ${String(err.message)}`,
        )
      })

      const appInstallIdMapping = await this.getAppInstallIdMapping()

      setTimeout(() => {
        const executionOptions = {
          printWorkerOutput:
            this._platformConfig.printEmbeddedCoreAppWorkerOutput,
          removeWorkerDirectory:
            this._platformConfig.removeEmbeddedCoreAppWorkerDirectories,
          printNsjailVerboseOutput:
            this._platformConfig.printEmbeddedCoreAppNsjailVerboseOutput,
        }
        const workerDataPayload: CoreWorkerMessagePayloadTypes['init']['request'] =
          {
            appInstallIdMapping,
            instanceId,
            executionOptions,
            serverBaseUrl: this.getServerBaseUrl(),
          }

        this.sendIpcMessage({
          type: 'request',
          id: crypto.randomUUID(),
          payload: {
            action: 'init',
            payload: workerDataPayload,
          },
        })
        this.logger.debug(
          `Serverless worker runner thread started with execution options: ${Object.keys(
            workerDataPayload.executionOptions ?? {},
          )
            .map((key) => `${key}=${workerDataPayload.executionOptions?.[key]}`)
            .join(', ')}`,
        )
      }, 500)
    }
  }

  async executeServerlessTask(
    payload: CoreWorkerMessagePayloadTypes['execute_task']['request'],
    timeoutMs = 5 * 60_000,
  ) {
    return this.sendRequest('execute_task', payload, timeoutMs)
  }

  async executeServerlessRequest(
    payload: CoreWorkerMessagePayloadTypes['execute_system_request']['request'],
    timeoutMs = 60_000,
  ) {
    return this.sendRequest('execute_system_request', payload, timeoutMs)
  }

  async updateAppInstallIdMapping() {
    const appInstallIdMapping = await this.getAppInstallIdMapping()
    this.sendIpcMessage({
      type: 'request',
      id: crypto.randomUUID(),
      payload: {
        action: 'update_app_install_id_mapping',
        payload: { appInstallIdMapping },
      },
    })
  }
}
