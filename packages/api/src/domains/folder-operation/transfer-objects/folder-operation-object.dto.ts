import type { OperationRelationType } from '../entities/folder-operation-object.entity'

export interface FolderOperationObjectData {
  id: string
  folderObject: { folderId: string; objectKey: string }
  operationRelationType: OperationRelationType
  createdAt: Date
}
