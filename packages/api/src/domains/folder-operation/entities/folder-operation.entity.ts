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

  @Property({ customType: new JsonType(), nullable: false })
  operationData!: { [key: string]: any }

  @Property({ nullable: false })
  started: boolean = false

  @Property({ nullable: false })
  completed: boolean = false

  @Property({ columnType: 'TEXT', nullable: false })
  operationName!: FolderOperationName

  @Property({ columnType: 'TEXT', nullable: true })
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
    nullable: false,
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
