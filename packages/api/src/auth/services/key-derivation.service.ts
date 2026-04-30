import { Inject, Injectable, OnModuleInit } from '@nestjs/common'
import nestjsConfig from '@nestjs/config'
import crypto from 'crypto'
import * as jose from 'jose'

import { authConfig } from '../config'

const HKDF_INFO = 'lombok-app-jwt-ed25519-v1'
const MIN_SECRET_BYTES = 32

const ED25519_PKCS8_PREFIX = Buffer.from(
  '302e020100300506032b657004220420',
  'hex',
)

@Injectable()
export class KeyDerivationService implements OnModuleInit {
  private privateKeyPem!: string
  private publicKeyPem!: string
  private joseSignKey!: jose.KeyLike
  private joseVerifyKey!: jose.KeyLike

  constructor(
    @Inject(authConfig.KEY)
    private readonly _authConfig: nestjsConfig.ConfigType<typeof authConfig>,
  ) {}

  async onModuleInit() {
    await this.deriveKeys()
  }

  private async deriveKeys() {
    const secret = Buffer.from(this._authConfig.authJwtSecret, 'utf8')
    if (secret.byteLength < MIN_SECRET_BYTES) {
      throw new Error(
        `AUTH_JWT_SECRET must be at least ${MIN_SECRET_BYTES} bytes for app token signing (got ${secret.byteLength})`,
      )
    }
    const seed = Buffer.from(
      crypto.hkdfSync('sha256', secret, Buffer.alloc(0), HKDF_INFO, 32),
    )
    const privatePkcs8Der = Buffer.concat([ED25519_PKCS8_PREFIX, seed])
    const privateKey = crypto.createPrivateKey({
      key: privatePkcs8Der,
      format: 'der',
      type: 'pkcs8',
    })
    const publicKey = crypto.createPublicKey(privateKey)
    this.privateKeyPem = privateKey.export({
      format: 'pem',
      type: 'pkcs8',
    }) as string
    this.publicKeyPem = publicKey.export({
      format: 'pem',
      type: 'spki',
    }) as string
    this.joseSignKey = await jose.importPKCS8(this.privateKeyPem, 'EdDSA')
    this.joseVerifyKey = await jose.importSPKI(this.publicKeyPem, 'EdDSA')
  }

  getPrivateKeyPem(): string {
    return this.privateKeyPem
  }

  getPublicKeyPem(): string {
    return this.publicKeyPem
  }

  getJoseSignKey(): jose.KeyLike {
    return this.joseSignKey
  }

  getJoseVerifyKey(): jose.KeyLike {
    return this.joseVerifyKey
  }
}
