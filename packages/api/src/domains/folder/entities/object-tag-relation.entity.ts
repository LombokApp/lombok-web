import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OptionalProps,
  PrimaryKey,
  Unique,
  UuidType,
} from '@mikro-orm/core'

import { TimestampedEntity } from '../../../entities/base.entity'
import { FolderObject } from './folder-object.entity'
import { ObjectTag } from './object-tag.entity'
import { ObjectTagRelationRepository } from './object-tag-relation.repository'

@Entity({
  tableName: 'object_tag_relation',
  customRepository: () => ObjectTagRelationRepository,
})
@Unique({ properties: ['tag', 'object'] })
export class ObjectTagRelation extends TimestampedEntity<ObjectTagRelation> {
  [EntityRepositoryType]?: ObjectTagRelationRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @ManyToOne({
    entity: () => ObjectTag,
    onDelete: 'cascade',
  })
  tag!: ObjectTag

  @ManyToOne({
    entity: () => FolderObject,
    onDelete: 'cascade',
  })
  object!: FolderObject

  toJSON() {
    return {
      folderId: this.object.folder.id,
      tagId: this.tag.id,
      tagName: this.tag.name,
    }
  }
}
