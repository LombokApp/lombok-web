import { CoreWorkerProcessDataPayload } from '@lombokapp/core-worker-utils'
import { CORE_APP_SLUG } from '@lombokapp/types'
import { Inject, Injectable, Logger } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { spawn } from 'child_process'
import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { APP_JWT_SUB_PREFIX, JWTService } from 'src/auth/services/jwt.service'
import { OrmService } from 'src/orm/orm.service'
import { platformConfig } from 'src/platform/config'
import { v4 as uuidV4 } from 'uuid'

import { appsTable } from './entities/app.entity'

@Injectable()
export class CoreAppService {
  private readonly logger = new Logger(CoreAppService.name)
  private child: ReturnType<typeof spawn> | undefined
  workers: Record<string, Worker | undefined> = {}

  constructor(
    private readonly jwtService: JWTService,
    @Inject(platformConfig.KEY)
    private readonly _platformConfig: nestjsConfig.ConfigType<
      typeof platformConfig
    >,
    private readonly ormService: OrmService,
  ) {}

  async getAppInstallIdMapping() {
    const allApps = await this.ormService.db.query.appsTable.findMany({
      limit: 1000,
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

  async startCoreAppThread() {
    const instanceId = `embedded_worker_1_${crypto.randomUUID()}`
    const coreApp = await this.ormService.db.query.appsTable.findFirst({
      where: eq(appsTable.slug, CORE_APP_SLUG),
    })
    if (!coreApp?.enabled) {
      this.logger.warn('Core app not enabled, skipping thread start')
      return
    }
    const isEmbeddedCoreAppEnabled =
      !this._platformConfig.disableEmbeddedCoreAppWorker
    if (!this.workers[instanceId] && isEmbeddedCoreAppEnabled) {
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
      // Listen for worker startup success/failure status lines
      let hasScheduledRetry = false
      interface WorkerStatusEvent {
        type: 'core_worker_status'
        status: 'ready' | 'error'
        port?: number
        error?: string
        instanceId: string
      }

      const handleStatusLine = (line: string) => {
        if (!this.child?.stdout || !this.child.stderr) {
          return
        }
        try {
          const evt = JSON.parse(line) as unknown as Partial<WorkerStatusEvent>
          if (
            typeof evt === 'object' &&
            'type' in evt &&
            (evt as { type?: unknown }).type === 'core_worker_status' &&
            'instanceId' in evt &&
            (evt as { instanceId?: unknown }).instanceId === instanceId
          ) {
            if (evt.status === 'ready') {
              this.logger.debug(
                `Embedded core app worker ready on port ${String(evt.port ?? 0)}`,
              )
            } else if (evt.status === 'error') {
              this.logger.error(
                `Embedded core app worker failed: ${String(evt.error)}`,
              )
              // Trigger retry by exiting this child if it's still alive
              try {
                this.child.kill()
              } catch {
                void 0
              }
              // Attempt a delayed retry of the whole thread execution
              if (!hasScheduledRetry) {
                hasScheduledRetry = true
                setTimeout(() => {
                  void this.startCoreAppThread()
                }, 1000)
              }
            }
          }
        } catch {
          void 0
        }
      }
      let stdoutBuffer = ''
      this.child.stdout?.on('data', (chunk: Buffer) => {
        stdoutBuffer += chunk.toString()
        let idx = stdoutBuffer.indexOf('\n')
        while (idx !== -1) {
          const line = stdoutBuffer.slice(0, idx)
          stdoutBuffer = stdoutBuffer.slice(idx + 1)
          handleStatusLine(line)
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
          handleStatusLine(line)
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
        if (code && code !== 0) {
          this.logger.warn(
            `Embedded core app worker exited with code ${String(code)}. Retrying...`,
          )
          if (!hasScheduledRetry) {
            hasScheduledRetry = true
            setTimeout(() => {
              void this.startCoreAppThread()
            }, 1000)
          }
        }
      })
      this.child.on('error', (err) => {
        this.logger.error(
          `Embedded core app worker process error: ${String(err.message)}`,
        )
      })
      const appToken = await this.jwtService.createAppWorkerToken(
        coreApp.identifier,
      )
      const appInstallIdMapping = await this.getAppInstallIdMapping()

      setTimeout(() => {
        // send the config as the first message
        const executionOptions = {
          printWorkerOutput:
            this._platformConfig.printEmbeddedCoreAppWorkerOutput,
          removeWorkerDirectory:
            this._platformConfig.removeEmbeddedCoreAppWorkerDirectories,
          printNsjailVerboseOutput:
            this._platformConfig.printEmbeddedCoreAppNsjailVerboseOutput,
        }
        const workerDataPayload: CoreWorkerProcessDataPayload = {
          socketBaseUrl: `http://127.0.0.1:3000`,
          appToken,
          appInstallIdMapping,
          instanceId,
          platformHost: this._platformConfig.platformHost,
          executionOptions,
        }

        this.child?.stdin?.write(JSON.stringify(workerDataPayload))
        this.logger.debug(
          'Embedded core app worker thread started with execution options:',
          workerDataPayload.executionOptions,
        )
      }, 500)
    }
  }

  async updateAppInstallIdMapping() {
    const appInstallIdMapping = await this.getAppInstallIdMapping()
    const workerDataPayload = {
      appInstallIdMapping,
    }
    this.child?.stdin?.write(JSON.stringify(workerDataPayload))
  }
}
