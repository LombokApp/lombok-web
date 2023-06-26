import type { MediaType } from '@stellariscloud/utils'

import type { TimestampData } from '../../../transfer-objects/timestamps.dto'

export interface ImagePreview {
  size: number
  path: string
}

export interface ImagePreviews {
  large?: ImagePreview
  medium?: ImagePreview
  small?: ImagePreview
}

export interface FolderObjectData extends TimestampData {
  id: string
  objectKey: string
  folder: {
    id: string
  }
  contentMetadata?: FolderObjectContentMetadata
  lastModified: number
  tags: string[]
  eTag: string
  sizeBytes: number
  readonly mediaType: MediaType
}

export interface FolderObjectContentMetadata {
  hash: string
  mimeType: string
  previews: ImagePreviews
  lengthMilliseconds: number
  imageOrientation?: number
  height: number
  width: number
  createdAt?: Date
}
