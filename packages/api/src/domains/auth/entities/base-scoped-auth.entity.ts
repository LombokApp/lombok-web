import { ArrayType, PrimaryKey, Property, UuidType } from '@mikro-orm/core'

import type { AuthScope } from '../constants/scope.constants'
import { BaseHashedTokenEntity } from './base-hashed-token.entity'

export abstract class BaseScopedAuthEntity<
  TClass,
> extends BaseHashedTokenEntity<TClass> {
  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ type: ArrayType, nullable: false, index: true })
  scopes: AuthScope[] = []
}
