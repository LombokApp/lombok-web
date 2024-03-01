import type {
  ContentAttributesByHash,
  ContentMetadataByHash,
  MediaType,
} from '@stellariscloud/types'
import { TimestampDTO } from 'src/core/transfer-objects/timestamps.dto'

export class FolderObjectDTO extends TimestampDTO {
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
