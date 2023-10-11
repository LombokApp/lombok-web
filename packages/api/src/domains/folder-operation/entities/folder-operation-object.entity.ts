import {
  Entity,
  EntityRepositoryType,
  Enum,
  ManyToOne,
  OptionalProps,
  PrimaryKey,
  Property,
  UuidType,
} from '@mikro-orm/core'

import { TimestampedEntity } from '../../../entities/base.entity'
import { FolderObject } from '../../folder/entities/folder-object.entity'
import type { FolderOperationObjectData } from '../transfer-objects/folder-operation-object.dto'
import { FolderOperation } from './folder-operation.entity'
import { FolderOperationObjectRepository } from './folder-operation-object.repository'

export enum OperationRelationType {
  INPUT = 'INPUT',
  OUTPUT = 'OUTPUT',
}

@Entity({
  tableName: 'folder_operation_object',
  customRepository: () => FolderOperationObjectRepository,
})
export class FolderOperationObject extends TimestampedEntity<FolderOperationObject> {
  [EntityRepositoryType]?: FolderOperationObjectRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Enum({ nullable: false })
  operationRelationType!: OperationRelationType

  @ManyToOne({
    entity: () => FolderObject,
    nullable: false,
    onDelete: 'cascade',
  })
  readonly folderObject!: FolderObject

  @Property({ columnType: 'TEXT', nullable: false })
  folderId!: string

  @Property({ columnType: 'TEXT', nullable: false })
  objectKey!: string

  @ManyToOne({
    entity: () => FolderOperation,
    onDelete: 'cascade',
    serializer: (o) => ({
      id: o.id as string,
    }),
  })
  readonly operation!: FolderOperation

  toFolderOperationObjectData(): FolderOperationObjectData {
    return {
      id: this.id,
      operationRelationType: this.operationRelationType,
      folderObject: { folderId: this.folderId, objectKey: this.objectKey },
      createdAt: this.createdAt,
    }
  }

  toJSON() {
    return this.toFolderOperationObjectData()
  }
}
