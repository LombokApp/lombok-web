import type { FolderObject } from 'src/folders/entities/folder-object.entity'

import type { FolderObjectDTO } from '../folder-object.dto'

export function transformFolderObjectToDTO(
  folderObject: FolderObject,
): FolderObjectDTO {
  return {
    id: folderObject.id,
    objectKey: folderObject.objectKey,
    sizeBytes: folderObject.sizeBytes,
    eTag: folderObject.eTag,
    folderId: folderObject.folderId,
    lastModified: folderObject.lastModified,
    mediaType: folderObject.mediaType,
    mimeType: folderObject.mimeType,
    hash: folderObject.hash,
  }
}
