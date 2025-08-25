import { createZodDto } from '@anatine/zod-nestjs'
import { MediaType } from '@lombokapp/types'
import { z } from 'zod'

import { mappingExtendedMetadataEntrySchema } from './content-metadata.dto'

export const contentMetadataSchema = z.record(
  z.string(),
  mappingExtendedMetadataEntrySchema.optional(),
)

export const folderObjectSchema = z.object({
  id: z.string().uuid(),
  objectKey: z.string(),
  folderId: z.string().uuid(),
  hash: z.string().optional(),
  lastModified: z.number(),
  eTag: z.string(),
  sizeBytes: z.number(),
  mimeType: z.string(),
  mediaType: z.nativeEnum(MediaType),
  contentMetadata: z.record(z.string(), contentMetadataSchema.optional()),
})

export class FolderObjectDTO extends createZodDto(folderObjectSchema) {}
