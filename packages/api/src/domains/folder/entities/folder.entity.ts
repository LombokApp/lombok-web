import {
  Collection,
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OneToMany,
  OptionalProps,
  PrimaryKey,
  Property,
  UuidType,
} from '@mikro-orm/core'

import { TimestampedEntity } from '../../../entities/base.entity'
import { User } from '../../user/entities/user.entity'
import type {
  FolderData,
  FolderPublicData,
} from '../transfer-objects/folder.dto'
import { FolderRepository } from './folder.repository'
import type { FolderShare } from './folder-share.entity'

@Entity({
  tableName: 'folder',
  customRepository: () => FolderRepository,
})
export class Folder extends TimestampedEntity {
  [EntityRepositoryType]?: FolderRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ nullable: false })
  name!: string

  @Property({ nullable: false })
  endpoint!: string

  @Property({ nullable: false })
  bucket!: string

  @Property()
  prefix?: string

  @Property()
  region?: string

  @Property({ nullable: false })
  accessKeyId!: string

  @Property({ nullable: false })
  secretAccessKey!: string

  @ManyToOne({
    entity: () => User,
    onDelete: 'set null',
  })
  owner?: User

  @OneToMany({ mappedBy: (share: FolderShare) => share.folder }) // referenced entity type can be sniffer too
  shares: Collection<FolderShare> = new Collection<FolderShare>(this)

  toFolderPublicData(): FolderPublicData {
    return this.toObjectPick(['name', 'endpoint', 'bucket', 'prefix', 'region'])
  }

  toFolderData(): FolderData {
    return this.toObjectPick([
      'id',
      'name',
      'endpoint',
      'bucket',
      'owner',
      'prefix',
      'region',
      'createdAt',
      'updatedAt',
      'accessKeyId',
    ])
  }

  toJSON() {
    return this.toFolderData()
  }
}
