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

import { BaseEntity } from '../../../entities/base.entity'
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
export class FolderOperationObject extends BaseEntity<FolderOperationObject> {
  [EntityRepositoryType]?: FolderOperationObjectRepository;
  [OptionalProps]?: 'updatedAt' | 'createdAt'

  @PrimaryKey({ customType: new UuidType(), defaultRaw: 'gen_random_uuid()' })
  id!: string

  @Enum()
  operationRelationType!: OperationRelationType

  @ManyToOne({
    entity: () => FolderObject,
    onDelete: 'cascade',
  })
  readonly folderObject!: FolderObject

  @Property({ columnType: 'TEXT' })
  folderId!: string

  @Property({ columnType: 'TEXT' })
  objectKey!: string

  @ManyToOne({
    entity: () => FolderOperation,
    onDelete: 'cascade',
    serializer: (o) => ({
      id: o.id as string,
    }),
  })
  readonly operation!: FolderOperation

  @Property({ columnType: 'timestamptz(3)' })
  readonly createdAt = new Date()

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
