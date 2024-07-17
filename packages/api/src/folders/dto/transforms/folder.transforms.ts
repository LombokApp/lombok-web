import type { Folder } from 'src/folders/entities/folder.entity'
import { transformLocationToDTO } from 'src/locations/dto/transforms/location.transforms'

import type { FolderDTO } from '../folder.dto'

export function transformFolderToDTO(folder: Folder): FolderDTO {
  return {
    id: folder.id,
    name: folder.name,
    ownerId: folder.ownerId,
    contentLocation: transformLocationToDTO(folder.contentLocation),
    metadataLocation: transformLocationToDTO(folder.contentLocation),
  }
}
