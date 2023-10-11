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
import type { S3LocationData } from '../transfer-objects/s3-location.dto'
import { S3LocationRepository } from './s3-location.repository'

@Entity({
  tableName: 's3_location',
  customRepository: () => S3LocationRepository,
})
export class S3Location extends TimestampedEntity<S3Location> {
  [EntityRepositoryType]?: S3LocationRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ columnType: 'TEXT', nullable: false })
  name!: string

  @Property({ columnType: 'TEXT', nullable: false })
  providerType!: 'USER' | 'SERVER'

  @Property({ columnType: 'TEXT', nullable: false })
  endpoint!: string

  @Property({ columnType: 'TEXT' })
  region?: string

  @Property({ columnType: 'TEXT', nullable: false })
  accessKeyId!: string

  @Property({ columnType: 'TEXT', nullable: false })
  secretAccessKey!: string

  @Property({ columnType: 'TEXT', nullable: false })
  bucket!: string

  @Property({ columnType: 'TEXT' })
  prefix?: string

  @ManyToOne({
    entity: () => User,
    onDelete: 'cascade',
  })
  user!: User

  toS3LocationData(): S3LocationData {
    return this.toObjectPick([
      'id',
      'name',
      'accessKeyId',
      'providerType',
      'endpoint',
      'region',
      'bucket',
      'prefix',
      'createdAt',
      'updatedAt',
    ])
  }

  toJSON() {
    return this.toS3LocationData()
  }
}
