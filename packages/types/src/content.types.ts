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
  sizeBytes: z.number(),
  hash: z.string(),
})

export const inlineMetadataEntrySchema = z.object({
  type: z.literal('inline'),
  mimeType: z.string(),
  sizeBytes: z.number(),
  content: z.string(),
})

export type ExternalMetadataEntry = z.infer<typeof externalMetadataEntrySchema>

export type InlineMetadataEntry = z.infer<typeof inlineMetadataEntrySchema>

export const metadataEntrySchema = z.discriminatedUnion('type', [
  inlineMetadataEntrySchema,
  externalMetadataEntrySchema,
])

export const previewMetadataSchema = z.object({
  mimeType: z.string(),
  profile: z.string(),
  label: z.string(),
  purpose: z.enum([
    'list', // small preview in lists/grids
    'card', // medium, card layouts
    'detail', // larger preview for detail pages
    'hero', // wide banner/header
    'background', // full-width/screen, often blurred
    'poster', // representative still/cover
    'overview', // condensed representation of the entire content (e.g. waveform, periodic frames)
    'preview', // generic fallback
  ]),
  sizeBytes: z.number(),
  dimensions: z.object({
    width: z.number(),
    height: z.number(),
    durationMs: z.number(),
  }),
  hash: z.string(),
})

export type ContentMetadataEntry = z.infer<typeof metadataEntrySchema>
export type PreviewMetadata = z.infer<typeof previewMetadataSchema>
export const contentMetadataSchema = z.record(z.string(), metadataEntrySchema)
export const contentMetadataByHashSchema = z.record(
  z.string(),
  contentMetadataSchema,
)

export type ContentMetadataType = z.infer<typeof contentMetadataSchema>
export type ContentMetadataByHash = z.infer<typeof contentMetadataByHashSchema>
