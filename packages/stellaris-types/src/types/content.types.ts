import { z } from 'zod'

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
}

export interface ContentAttributesByHash {
  // keyed by content hash (e.g. "SHA1:<hash>")
  [hash: string]: ContentAttributesType | undefined
}

export const metadataEntrySchema = z
  .object({
    mimeType: z.string(),
    size: z.number(),
    hash: z.string(),
    storageKey: z.string(),
    content: z.literal(''),
  })
  .or(
    z.object({
      mimeType: z.string(),
      size: z.number(),
      hash: z.literal(''),
      storageKey: z.literal(''),
      content: z.string(),
    }),
  )

export type MetadataEntry = z.infer<typeof metadataEntrySchema>


export interface ContentMetadataType {
  [key: string]: MetadataEntry
}

export interface ContentMetadataByHash {
  // keyed by content hash (e.g. "SHA1:<hash>")
  [key: string]: ContentMetadataType
}
