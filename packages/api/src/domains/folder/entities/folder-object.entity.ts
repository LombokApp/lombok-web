import {
  BigIntType,
  Collection,
  Entity,
  EntityRepositoryType,
  Enum,
  JsonType,
  ManyToMany,
  ManyToOne,
  OneToMany,
  OptionalProps,
  PrimaryKey,
  Property,
  Unique,
  UuidType,
} from '@mikro-orm/core'
import {
  ContentAttributesByHash,
  ContentMetadataByHash,
  MediaType,
} from '@stellariscloud/types'

import { TimestampedEntity } from '../../../entities/base.entity'
import { FolderOperation } from '../../folder-operation/entities/folder-operation.entity'
import { FolderOperationObject } from '../../folder-operation/entities/folder-operation-object.entity'
import type { FolderObjectData } from '../transfer-objects/folder-object.dto'
import { Folder } from './folder.entity'
import { FolderObjectRepository } from './folder-object.repository'
import type { ObjectTagRelation } from './object-tag-relation.entity'

export class NumericBigIntType extends BigIntType {
  convertToJSValue(value: string): any {
    if (!value) {
      return value
    }

    return parseInt(value, 10)
  }
}

@Entity({
  tableName: 'folder_object',
  customRepository: () => FolderObjectRepository,
})
@Unique({ properties: ['folder', 'objectKey'] })
export class FolderObject extends TimestampedEntity<FolderObject> {
  [EntityRepositoryType]?: FolderObjectRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ columnType: 'TEXT', nullable: false })
  objectKey!: string

  @Property({ columnType: 'TEXT', nullable: false })
  eTag!: string

  @Property({
    customType: new NumericBigIntType(),
    unsigned: true,
    nullable: false,
  })
  sizeBytes!: number

  @Property({
    customType: new NumericBigIntType(),
    unsigned: true,
    nullable: false,
  })
  lastModified!: number

  // The last known content hash. e.g. "SHA1:<hash>"
  @Property({ columnType: 'TEXT' })
  hash?: string

  // The last best guess  MediaType
  @Enum({ nullable: false, items: () => MediaType })
  // @Enum(() => MediaType)
  mediaType: MediaType = MediaType.Unknown

  @Property({ columnType: 'TEXT', nullable: false })
  mimeType: string = ''

  @Property({ customType: new JsonType(), nullable: false })
  contentAttributes: ContentAttributesByHash = {}

  @Property({ customType: new JsonType(), nullable: false })
  contentMetadata: ContentMetadataByHash = {}

  @ManyToOne({
    entity: () => Folder,
    onDelete: 'cascade',
    nullable: false,
    serializer: (f) => ({
      id: f.id as string,
    }),
  })
  readonly folder!: Folder

  @ManyToMany({
    entity: () => FolderOperation,
    pivotEntity: () => FolderOperationObject,
  })
  operations: Collection<FolderOperation> = new Collection<FolderOperation>(
    this,
  )

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
        'contentAttributes',
        'contentMetadata',
        'hash',
        'createdAt',
        'updatedAt',
        'mediaType',
        'mimeType',
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
