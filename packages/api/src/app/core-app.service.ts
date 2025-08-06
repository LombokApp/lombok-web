import { Inject, Injectable, Logger } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import { spawn } from 'child_process'
import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import jwt, { JwtPayload } from 'jsonwebtoken'
import path from 'path'
import { authConfig } from 'src/auth/config'
import { coreConfig } from 'src/core/config'
import { OrmService } from 'src/orm/orm.service'
import { v4 as uuidV4 } from 'uuid'

import { CoreWorkerProcessDataPayload } from './core-app-worker'
import { appsTable } from './entities/app.entity'

@Injectable()
export class CoreAppService {
  private readonly logger = new Logger(CoreAppService.name)
  workers: Record<string, Worker | undefined> = {}

  constructor(
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
    @Inject(authConfig.KEY)
    private readonly _authConfig: nestjsConfig.ConfigType<typeof authConfig>,
    private readonly ormService: OrmService,
  ) {}

  async startCoreModuleThread(appWorkerId: string) {
    const isEmbeddedCoreAppEnabled =
      !this._coreConfig.disableEmbeddedCoreAppWorker
    if (!this.workers[appWorkerId] && isEmbeddedCoreAppEnabled) {
      // run the core-app-worker.ts script in a child thread
      const child = spawn(
        'bun',
        [path.join(import.meta.dirname, 'core-app-worker')],
        {
          uid: 1000,
          gid: 1000,
          stdio: ['pipe', 'inherit', 'inherit'],
        },
      )
      const appToken = !this._coreConfig.embeddedCoreAppToken
        ? await this.generateEmbeddedAppKeys()
        : this._coreConfig.embeddedCoreAppToken
      setTimeout(() => {
        // send the config as the first message

        const workerDataPayload: CoreWorkerProcessDataPayload = {
          socketBaseUrl: `http://127.0.0.1:3000`,
          appToken,
          appWorkerId,
          jwtSecret: this._authConfig.authJwtSecret,
          hostId: this._coreConfig.hostId,
          executionOptions: {
            printWorkerOutput: this._coreConfig.printCoreProcessWorkerOutput,
            emptyWorkerTmpDir: this._coreConfig.emptyCoreProcessWorkerTmpDirs,
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
      aud: this._coreConfig.hostId,
      jti: uuidV4(),
      scp: [],
      sub: `app:core`,
    }

    const token = jwt.sign(payload, keys.privateKey, {
      algorithm: 'RS512',
    })

    jwt.verify(token, keys.publicKey)
    // const coreApp = await this.ormService.db.query.appsTable.findFirst({
    //   where: eq(appsTable.identifier, 'core'),
    // })
    await this.ormService.db
      .update(appsTable)
      .set({ publicKey: keys.publicKey })
      .where(eq(appsTable.identifier, 'core'))

    return token
  }
}
