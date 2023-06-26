import { BeforeCreate, PrimaryKey, Property, UuidType } from '@mikro-orm/core'
import crypto from 'crypto'

import { BaseAccessTokenEntity } from './base-access-token.entity'

export abstract class BaseHashedAccessTokenEntity extends BaseAccessTokenEntity {
  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ hidden: true })
  hash!: string

  @Property({ hidden: true, persist: false })
  secret?: Buffer

  static createSecretKey(length: number = 32) {
    return crypto.randomBytes(length)
  }

  static createHash(secret: Buffer) {
    return crypto.createHash('SHA512').update(secret).digest('hex')
  }

  @BeforeCreate()
  initHash() {
    if (this.secret) {
      this.hash = BaseHashedAccessTokenEntity.createHash(this.secret)
    }
  }

  static decode(encoded: string) {
    // eslint-disable-next-line prefer-const
    let [id = '', secret = ''] = encoded.split(':')

    secret = secret.replace(/-/g, '+').replace(/_/g, '/')

    while (secret.length % 4) {
      secret += '='
    }

    return [id, Buffer.from(secret, 'base64')] as const
  }

  static encode(id: string, secret: Buffer) {
    const encoded = secret
      .toString('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')

    return [id, encoded].join(':')
  }
}
