import {
  Entity,
  EntityRepositoryType,
  JsonType,
  ManyToOne,
  OptionalProps,
  PrimaryKey,
  Property,
  Unique,
  UuidType,
} from '@mikro-orm/core'

import { TimestampedEntity } from '../../../entities/base.entity'
import { User } from '../../user/entities/user.entity'
import type { FolderShareData } from '../transfer-objects/folder-share.dto'
import { FolderShareConfig } from '../transfer-objects/folder-share.dto'
import { Folder } from './folder.entity'
import { FolderShareRepository } from './folder-share.repository'

@Entity({
  tableName: 'folder_share',
  customRepository: () => FolderShareRepository,
})
@Unique({ properties: ['user', 'folder'] })
export class FolderShare extends TimestampedEntity<FolderShare> {
  [EntityRepositoryType]?: FolderShareRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ nullable: false })
  userLabel!: string

  @Property({ nullable: false })
  userInviteEmail!: string

  @ManyToOne({
    entity: () => User,
    onDelete: 'cascade',
  })
  readonly user?: User

  @ManyToOne({
    entity: () => Folder,
    onDelete: 'cascade',
    serializer: (f) => f.id,
    serializedName: 'folderId',
  })
  readonly folder!: Folder

  @Property({ customType: new JsonType() })
  shareConfiguration!: FolderShareConfig

  toFolderShareData(): FolderShareData {
    return {
      ...this.toObjectPick([
        'id',
        'userLabel',
        'userInviteEmail',
        'folder',
        'shareConfiguration',
        'createdAt',
        'updatedAt',
      ]),
    }
  }

  toJSON() {
    return this.toFolderShareData()
  }
}
