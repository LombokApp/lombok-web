import {
  ArrayType,
  Cascade,
  Index,
  ManyToOne,
  PrimaryKey,
  Property,
  UuidType,
} from '@mikro-orm/core'

import { TimestampedEntity } from '../../../entities/base.entity'
import { User } from '../../user/entities/user.entity'

export abstract class BaseAccessTokenEntity extends TimestampedEntity {
  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ hidden: true })
  deletedAt?: Date

  @Property({ persist: false })
  get deleted() {
    return !!this.deletedAt
  }

  set deleted(deleted: boolean) {
    this.deletedAt = deleted ? new Date() : undefined
  }

  @Index()
  @Property({ type: ArrayType, nullable: false })
  scopes: string[] = []

  @ManyToOne({
    entity: () => User,
    cascade: [Cascade.ALL],
    onDelete: 'cascade',
    hidden: true,
    eager: true,
  })
  user!: User
}
