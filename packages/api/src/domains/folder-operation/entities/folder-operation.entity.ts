import {
  Collection,
  Entity,
  EntityRepositoryType,
  JsonType,
  ManyToOne,
  OneToMany,
  OptionalProps,
  PrimaryKey,
  Property,
  UuidType,
} from '@mikro-orm/core'
import { FolderOperationName } from '@stellariscloud/workers'

import { TimestampedEntity } from '../../../entities/base.entity'
import { Folder } from '../../folder/entities/folder.entity'
import type { FolderOperationData } from '../transfer-objects/folder-operation.dto'
import { FolderOperationRepository } from './folder-operation.repository'
import type { FolderOperationObject } from './folder-operation-object.entity'

@Entity({
  tableName: 'folder_operation',
  customRepository: () => FolderOperationRepository,
})
export class FolderOperation extends TimestampedEntity<FolderOperation> {
  [EntityRepositoryType]?: FolderOperationRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Property({ customType: new JsonType() })
  operationData!: { [key: string]: any }

  @Property()
  started: boolean = false

  @Property()
  completed: boolean = false

  @Property({ columnType: 'TEXT' })
  operationName!: FolderOperationName

  @Property()
  error?: string

  @OneToMany({
    mappedBy: (operationObject: FolderOperationObject) =>
      operationObject.operation,
  })
  relatedObjects: Collection<FolderOperationObject> =
    new Collection<FolderOperationObject>(this)

  @ManyToOne({
    entity: () => Folder,
    onDelete: 'cascade',
    serializer: (f) => ({
      id: f.id as string,
    }),
  })
  readonly folder!: Folder

  toFolderOperationData() {
    return this.toObject()
  }

  toJSON(): FolderOperationData {
    return this.toFolderOperationData()
  }
}
