export enum MediaType {
  Image = 'IMAGE',
  Video = 'VIDEO',
  Audio = 'AUDIO',
  Document = 'DOCUMENT',
  Unknown = 'UNKNOWN',
}

export enum ThumbnailSize {
  Medium = 'medium',
  Small = 'small',
}

export interface ContentAttributesType {
  mediaType: MediaType
  mimeType: string
  height: number
  width: number
  orientation: number
  lengthMs: number
  bitrate: number
}

export interface ContentAttributesByHash {
  // keyed by content hash (e.g. "SHA1:<hash>")
  [hash: string]: ContentAttributesType | undefined
}

export interface MetadataEntry {
  mimeType: string
  size: number
  hash: string
}

export interface ContentMetadataType {
  [key: string]: MetadataEntry | undefined
}

export interface ContentMetadataByHash {
  // keyed by content hash (e.g. "SHA1:<hash>")
  [key: string]: ContentMetadataType | undefined
}
