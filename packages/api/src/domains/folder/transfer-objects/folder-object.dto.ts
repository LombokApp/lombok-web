import type {
  ContentAttributesByHash,
  ContentMetadataByHash,
  MediaType,
} from '@stellariscloud/types'

import type { TimestampData } from '../../../transfer-objects/timestamps.dto'

export interface FolderObjectData extends TimestampData {
  id: string
  objectKey: string
  folderId: string
  contentAttributes: ContentAttributesByHash
  contentMetadata: ContentMetadataByHash
  hash: string | null
  lastModified: number
  eTag: string
  sizeBytes: number
  mediaType: MediaType
  mimeType: string
}
