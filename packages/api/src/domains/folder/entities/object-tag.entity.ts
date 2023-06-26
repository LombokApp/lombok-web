import {
  Entity,
  EntityRepositoryType,
  ManyToOne,
  OptionalProps,
  PrimaryKey,
  Property,
  Unique,
  UuidType,
} from '@mikro-orm/core'

import { TimestampedEntity } from '../../../entities/base.entity'
import type { ObjectTagData } from '../transfer-objects/object-tag.dto'
import { Folder } from './folder.entity'
import { ObjectTagRepository } from './object-tag.repository'

@Entity({
  tableName: 'object_tag',
  customRepository: () => ObjectTagRepository,
})
@Unique({ properties: ['name', 'folder'] })
export class ObjectTag extends TimestampedEntity {
  [EntityRepositoryType]?: ObjectTagRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ columnType: 'TEXT' })
  name!: string

  @ManyToOne({
    entity: () => Folder,
    onDelete: 'cascade',
  })
  readonly folder!: Folder

  toObjectTagData(): ObjectTagData {
    return this.toObjectPick(['id', 'name', 'createdAt', 'updatedAt'])
  }

  toJSON() {
    return this.toObjectTagData()
  }
}
