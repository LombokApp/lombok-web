import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OptionalProps,
  PrimaryKey,
  Property,
  UuidType,
} from '@mikro-orm/core'

import { TimestampedEntity } from '../../../entities/base.entity'
import { User } from '../../user/entities/user.entity'
import type { S3ConnectionData } from '../transfer-objects/s3-connection.dto'
import { S3ConnectionRepository } from './s3-connection.repository'

@Entity({
  tableName: 's3_connection',
  customRepository: () => S3ConnectionRepository,
})
export class S3Connection extends TimestampedEntity<S3Connection> {
  [EntityRepositoryType]?: S3ConnectionRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt' | 'outputDerived'

  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property()
  name!: string

  @Property()
  endpoint!: string

  @Property()
  region?: string

  @Property()
  accessKeyId!: string

  @Property()
  secretAccessKey!: string

  @ManyToOne({
    entity: () => User,
    onDelete: 'set null',
  })
  owner?: User

  toS3ConnectionData(): S3ConnectionData {
    return this.toObjectPick([
      'id',
      'name',
      'endpoint',
      'owner',
      'region',
      'createdAt',
      'updatedAt',
      'accessKeyId',
    ])
  }

  toJSON() {
    return this.toS3ConnectionData()
  }
}
