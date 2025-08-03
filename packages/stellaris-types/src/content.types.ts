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

export const externalMetadataEntrySchema = z.object({
  type: z.literal('external'),
  storageKey: z.string(),
  mimeType: z.string(),
  size: z.number(),
  hash: z.string(),
})

export const inlineMetadataEntrySchema = z.object({
  type: z.literal('inline'),
  mimeType: z.string(),
  size: z.number(),
  content: z.string(),
})

export type ExternalMetadataEntry = z.infer<typeof externalMetadataEntrySchema>

export type InlineMetadataEntry = z.infer<typeof inlineMetadataEntrySchema>

export const metadataEntrySchema = z.discriminatedUnion('type', [
  inlineMetadataEntrySchema,
  externalMetadataEntrySchema,
])

export type ContentMetadataEntry = z.infer<typeof metadataEntrySchema>

export const contentMetadataSchema = z.record(
  z.string(),
  metadataEntrySchema.optional(),
)
export const contentMetadataByHashSchema = z.record(
  z.string(),
  contentMetadataSchema.optional(),
)

export type ContentMetadataType = z.infer<typeof contentMetadataSchema>
export type ContentMetadataByHash = z.infer<typeof contentMetadataByHashSchema>
