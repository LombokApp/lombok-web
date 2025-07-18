import { createZodDto } from '@anatine/zod-nestjs'
import { contentMetadataByHashSchema, MediaType } from '@stellariscloud/types'
import { z } from 'zod'

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
  contentMetadata: contentMetadataByHashSchema,
})

export class FolderObjectDTO extends createZodDto(folderObjectSchema) {}
