import { Inject, Injectable, Logger } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import crypto from 'crypto'
import { eq } from 'drizzle-orm'
import jwt, { JwtPayload } from 'jsonwebtoken'
import path from 'path'
import { coreConfig } from 'src/core/config'
import { OrmService } from 'src/orm/orm.service'
import { v4 as uuidV4 } from 'uuid'

import { appsTable } from './entities/app.entity'

@Injectable()
export class CoreAppService {
  private readonly logger = new Logger(CoreAppService.name)
  workers: Record<string, Worker | undefined> = {}

  constructor(
    @Inject(coreConfig.KEY)
    private readonly _coreConfig: nestjsConfig.ConfigType<typeof coreConfig>,
    private readonly ormService: OrmService,
  ) {}

  async startCoreModuleThread(appWorkerId: string) {
    const isEmbeddedCoreAppEnabled =
      !this._coreConfig.disableEmbeddedCoreAppWorker
    if (!this.workers[appWorkerId] && isEmbeddedCoreAppEnabled) {
      // run the core-app-worker.ts script in a worker thread
      const worker = (this.workers[appWorkerId] = new Worker(
        path.join(__dirname, 'core-app-worker'),
        {
          name: appWorkerId,
        },
      ))
      const appToken = !this._coreConfig.embeddedCoreAppToken
        ? await this.generateEmbeddedAppKeys()
        : this._coreConfig.embeddedCoreAppToken

      setTimeout(() => {
        // send the config as the first message
        worker.postMessage({
          socketBaseUrl: `http://127.0.0.1:3000`,
          appToken,
          appWorkerId,
        })
      }, 500)

      this.logger.debug('Embedded core app worker thread started')

      // worker.addEventListener('error', (err) => {
      //   this.logger.error('Worker thread error:', err)
      // })

      // worker.addEventListener('exit', (err) => {
      //   this.logger.log('Worker thread exit:', err)
      // })

      // worker.addEventListener('message', (event) => {
      //   this.logger.debug('Embedded core worker event:', event.data)
      // })
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
