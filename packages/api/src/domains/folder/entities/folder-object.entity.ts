import {
  Collection,
  Entity,
  EntityRepositoryType,
  Enum,
  JsonType,
  ManyToOne,
  OneToMany,
  OptionalProps,
  PrimaryKey,
  Property,
  Unique,
  UuidType,
} from '@mikro-orm/core'
import { MediaType } from '@stellariscloud/utils'

import { TimestampedEntity } from '../../../entities/base.entity'
import type { FolderObjectData } from '../transfer-objects/folder-object.dto'
import { FolderObjectContentMetadata } from '../transfer-objects/folder-object.dto'
import { Folder } from './folder.entity'
import { FolderObjectRepository } from './folder-object.repository'
import type { ObjectTagRelation } from './object-tag-relation.entity'

@Entity({
  tableName: 'folder_object',
  customRepository: () => FolderObjectRepository,
})
@Unique({ properties: ['folder', 'objectKey'] })
export class FolderObject extends TimestampedEntity {
  [EntityRepositoryType]?: FolderObjectRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ columnType: 'TEXT' })
  objectKey!: string

  @Property({ columnType: 'TEXT' })
  eTag!: string

  @Property({ columnType: 'bigint', unsigned: true })
  sizeBytes!: number

  @Property({ columnType: 'bigint', unsigned: true })
  lastModified!: number

  @Property({ customType: new JsonType() })
  contentMetadata?: FolderObjectContentMetadata

  @Enum(() => MediaType)
  mediaType: MediaType = MediaType.Unknown

  @ManyToOne({
    entity: () => Folder,
    onDelete: 'cascade',
    serializer: (f) => ({
      id: f.id as string,
    }),
  })
  readonly folder!: Folder

  @OneToMany({
    mappedBy: (tagRelation: ObjectTagRelation) => tagRelation.object,
  })
  tags: Collection<ObjectTagRelation> = new Collection<ObjectTagRelation>(this)

  toFolderObjectData(): FolderObjectData {
    return {
      ...this.toObjectPick([
        'id',
        'objectKey',
        'sizeBytes',
        'folder',
        'eTag',
        'lastModified',
        'contentMetadata',
        'createdAt',
        'updatedAt',
        'mediaType',
      ]),
      tags: this.tags.isInitialized()
        ? this.tags.getItems().map((t) => t.tag.id)
        : [],
    }
  }

  toJSON() {
    return this.toFolderObjectData()
  }
}
