import type { Folder } from 'src/folders/entities/folder.entity'
import { transformStorageLocationToDTO } from 'src/storage/dto/transforms/storage-location.transforms'

import type { FolderDTO } from '../folder.dto'

export function transformFolderToDTO(folder: Folder): FolderDTO {
  return {
    id: folder.id,
    name: folder.name,
    ownerId: folder.ownerId,
    contentLocation: transformStorageLocationToDTO(folder.contentLocation),
    metadataLocation: transformStorageLocationToDTO(folder.metadataLocation),
    accessError: folder.accessError,
    createdAt: folder.createdAt.toISOString(),
    updatedAt: folder.updatedAt.toISOString(),
  }
}
