import type { FolderObject } from '../entities/folder-object.entity'
import type { FolderObjectData } from '../transfer-objects/folder-object.dto'

export const transformFolderObjectToFolderObjectDTO = (
  folderObject: FolderObject,
): FolderObjectData => ({
  id: folderObject.id,
  objectKey: folderObject.objectKey,
  folderId: folderObject.folderId,
  eTag: folderObject.eTag,
  lastModified: folderObject.lastModified,
  mediaType: folderObject.mediaType,
  mimeType: folderObject.mimeType,
  sizeBytes: folderObject.sizeBytes,
  hash: folderObject.hash,
  createdAt: folderObject.createdAt,
  updatedAt: folderObject.updatedAt,
  contentAttributes: folderObject.contentAttributes,
  contentMetadata: folderObject.contentMetadata,
})
