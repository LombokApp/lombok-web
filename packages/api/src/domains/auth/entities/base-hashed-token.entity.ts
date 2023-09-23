import {
  Cascade,
  ManyToOne,
  PrimaryKey,
  Property,
  UuidType,
} from '@mikro-orm/core'
import crypto from 'crypto'

import { TimestampedEntity } from '../../../entities/base.entity'
import { User } from '../../user/entities/user.entity'

export abstract class BaseHashedTokenEntity<
  Child,
> extends TimestampedEntity<Child> {
  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ hidden: true })
  hash!: string

  @Property({ hidden: true, persist: false })
  secret?: Buffer

  @ManyToOne({
    entity: () => User,
    cascade: [Cascade.ALL],
    onDelete: 'cascade',
    hidden: true,
    eager: true,
  })
  user!: User

  static createSecretKey(length: number = 32) {
    return crypto.randomBytes(length)
  }

  static createHash(secret: Buffer) {
    return crypto.createHash('SHA512').update(secret).digest('hex')
  }

  static decode(refreshToken: string) {
    // eslint-disable-next-line prefer-const
    let [id = '', secret = ''] = refreshToken.split(':')

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
