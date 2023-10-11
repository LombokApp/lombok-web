import {
  Collection,
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OneToMany,
  OneToOne,
  OptionalProps,
  PrimaryKey,
  Property,
  UuidType,
} from '@mikro-orm/core'

import { TimestampedEntity } from '../../../entities/base.entity'
import { S3Location } from '../../s3/entities/s3-location.entity'
import { User } from '../../user/entities/user.entity'
import type { FolderData } from '../transfer-objects/folder.dto'
import { FolderRepository } from './folder.repository'
import type { FolderShare } from './folder-share.entity'

@Entity({
  tableName: 'folder',
  customRepository: () => FolderRepository,
})
export class Folder extends TimestampedEntity<Folder> {
  [EntityRepositoryType]?: FolderRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ columnType: 'TEXT', nullable: false })
  name!: string

  @OneToOne({
    entity: () => S3Location,
    onDelete: 'cascade',
  })
  contentLocation!: S3Location

  @OneToOne({
    entity: () => S3Location,
    onDelete: 'cascade',
  })
  metadataLocation!: S3Location

  @ManyToOne({
    entity: () => User,
    onDelete: 'cascade',
  })
  owner!: User

  @OneToMany({ mappedBy: (share: FolderShare) => share.folder })
  shares: Collection<FolderShare> = new Collection<FolderShare>(this)

  toFolderData(): FolderData {
    return {
      contentLocation: this.contentLocation.toS3LocationData(),
      metadataLocation: this.metadataLocation.toS3LocationData(),
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      name: this.name,
      id: this.id,
    }
  }

  toJSON() {
    return this.toFolderData()
  }
}
