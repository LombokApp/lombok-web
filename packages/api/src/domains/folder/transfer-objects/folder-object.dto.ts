import type {
  ContentAttributesByHash,
  ContentMetadataByHash,
  MediaType,
} from '@stellariscloud/types'

import type { TimestampData } from '../../../transfer-objects/timestamps.dto'

export interface FolderObjectData extends TimestampData {
  id: string
  objectKey: string
  folder: {
    id: string
  }
  contentAttributes: ContentAttributesByHash
  contentMetadata: ContentMetadataByHash
  hash?: string
  lastModified: number
  tags: string[]
  eTag: string
  sizeBytes: number
  mediaType: MediaType
  mimeType: string
}
