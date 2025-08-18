import { Inject, Injectable, Logger } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { CORE_APP_IDENTIFIER } from '@stellariscloud/types'
import { spawn } from 'child_process'
import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import jwt, { JwtPayload } from 'jsonwebtoken'
import path from 'path'
import { authConfig } from 'src/auth/config'
import { OrmService } from 'src/orm/orm.service'
import { platformConfig } from 'src/platform/config'
import { v4 as uuidV4 } from 'uuid'

import { CoreWorkerProcessDataPayload } from './core-app-worker'
import { appsTable } from './entities/app.entity'
import { APP_JWT_SUB_PREFIX } from 'src/auth/services/jwt.service'

@Injectable()
export class CoreAppService {
  private readonly logger = new Logger(CoreAppService.name)
  workers: Record<string, Worker | undefined> = {}

  constructor(
    @Inject(platformConfig.KEY)
    private readonly _platformConfig: nestjsConfig.ConfigType<
      typeof platformConfig
    >,
    @Inject(authConfig.KEY)
    private readonly _authConfig: nestjsConfig.ConfigType<typeof authConfig>,
    private readonly ormService: OrmService,
  ) {}

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
    const appWorkerId = `embedded_worker_1_${crypto.randomUUID()}`
    const coreApp = await this.ormService.db.query.appsTable.findFirst({
      where: eq(appsTable.identifier, CORE_APP_IDENTIFIER),
    })
    if (!coreApp || !coreApp.enabled) {
      this.logger.warn('Core app not enabled, skipping thread start')
      return
    }
    const isEmbeddedCoreAppEnabled =
      !this._platformConfig.disableEmbeddedCoreAppWorker
    if (!this.workers[appWorkerId] && isEmbeddedCoreAppEnabled) {
      // run the core-app-worker.ts script in a child thread
      const child = spawn(
        'bun',
        [path.join(import.meta.dirname, 'core-app-worker')],
        {
          uid: 1000,
          gid: 1000,
          stdio: ['pipe', 'pipe', 'pipe'],
        },
      )
      this.setupParentShutdownHooks(child)
      // Listen for worker startup success/failure status lines
      let hasScheduledRetry = false
      interface WorkerStatusEvent {
        type: 'core_worker_status'
        status: 'ready' | 'error'
        port?: number
        error?: string
        appWorkerId: string
      }

      const handleStatusLine = (line: string) => {
        try {
          const evt = JSON.parse(line) as unknown as Partial<WorkerStatusEvent>
          if (
            typeof evt === 'object' &&
            'type' in evt &&
            (evt as { type?: unknown }).type === 'core_worker_status' &&
            'appWorkerId' in evt &&
            (evt as { appWorkerId?: unknown }).appWorkerId === appWorkerId
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
                child.kill()
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
      child.stdout.on('data', (chunk: Buffer) => {
        stdoutBuffer += chunk.toString()
        let idx = stdoutBuffer.indexOf('\n')
        while (idx !== -1) {
          const line = stdoutBuffer.slice(0, idx)
          stdoutBuffer = stdoutBuffer.slice(idx + 1)
          handleStatusLine(line)
          idx = stdoutBuffer.indexOf('\n')
        }
      })

      // Also parse error channel for JSON lines if emitted there
      let stderrBuffer = ''
      child.stderr.on('data', (chunk: Buffer) => {
        stderrBuffer += chunk.toString()
        let idx = stderrBuffer.indexOf('\n')
        while (idx !== -1) {
          const line = stderrBuffer.slice(0, idx)
          stderrBuffer = stderrBuffer.slice(idx + 1)
          handleStatusLine(line)
          idx = stderrBuffer.indexOf('\n')
        }
      })

      // If the child exits unexpectedly, schedule a retry
      child.on('exit', (code) => {
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
      const appToken = await this.generateEmbeddedAppKeys()
      setTimeout(() => {
        // send the config as the first message

        const workerDataPayload: CoreWorkerProcessDataPayload = {
          socketBaseUrl: `http://127.0.0.1:3000`,
          appToken,
          appWorkerId,
          jwtSecret: this._authConfig.authJwtSecret,
          hostId: this._platformConfig.hostId,
          executionOptions: {
            printWorkerOutput:
              this._platformConfig.printCoreProcessWorkerOutput,
            emptyWorkerTmpDir:
              this._platformConfig.emptyCoreProcessWorkerTmpDirs,
          },
        }

        child.stdin.write(JSON.stringify(workerDataPayload))
        this.logger.debug('Embedded core app worker thread started')
      }, 500)
    }
  }

  async generateEmbeddedAppKeys() {
    const keys = await new Promise<{ publicKey: string; privateKey: string }>(
      (resolve) =>
        crypto.generateKeyPair(
          'rsa',
          {
            modulusLength: 4096,
            publicKeyEncoding: {
              type: 'spki',
              format: 'pem',
            },
            privateKeyEncoding: {
              type: 'pkcs8',
              format: 'pem',
              cipher: undefined,
              passphrase: undefined,
            },
          },
          (err, publicKey, privateKey) => {
            // Handle errors and use the generated key pair.
            resolve({ publicKey, privateKey })
          },
        ),
    )

    const payload: JwtPayload = {
      aud: this._platformConfig.hostId,
      jti: uuidV4(),
      scp: [],
      sub: `${APP_JWT_SUB_PREFIX}${CORE_APP_IDENTIFIER}`,
    }

    const token = jwt.sign(payload, keys.privateKey, {
      algorithm: 'RS512',
    })

    jwt.verify(token, keys.publicKey)

    await this.ormService.db
      .update(appsTable)
      .set({ publicKey: keys.publicKey })
      .where(eq(appsTable.identifier, CORE_APP_IDENTIFIER))

    return token
  }
}
