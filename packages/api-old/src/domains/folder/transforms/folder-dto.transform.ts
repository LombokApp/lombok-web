import { transformStorageLocationToStorageLocationDTO } from '../../storage-location/transforms/storage-location-dto.transform'
import type { Folder } from '../entities/folder.entity'
import type { FolderData } from '../transfer-objects/folder.dto'

export const transformFolderToFolderDTO = (folder: Folder): FolderData => ({
  id: folder.id,
  name: folder.name,
  createdAt: folder.createdAt,
  updatedAt: folder.updatedAt,
  ownerId: folder.ownerId,
  contentLocation: transformStorageLocationToStorageLocationDTO(
    folder.contentLocation,
  ),
  metadataLocation: transformStorageLocationToStorageLocationDTO(
    folder.metadataLocation,
  ),
})
