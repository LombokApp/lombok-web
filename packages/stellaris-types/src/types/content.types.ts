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

export type ContentMetadataEntry = z.infer<typeof metadataEntrySchema>

export const contentMetadataTypeSchema = z.record(
  z.string(),
  metadataEntrySchema.optional(),
)
export const contentMetadataByHashSchema = z.record(
  z.string(),
  contentMetadataTypeSchema.optional(),
)

export type ContentMetadataType = z.infer<typeof contentMetadataTypeSchema>
export type ContentMetadataByHash = z.infer<typeof contentMetadataByHashSchema>
