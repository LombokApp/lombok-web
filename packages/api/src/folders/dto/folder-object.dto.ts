import { createZodDto } from '@anatine/zod-nestjs'
import { MediaType } from '@stellariscloud/types'
import { z } from 'zod'

export const folderObjectSchema = z.object({
  id: z.string(),
  objectKey: z.string(),
  folderId: z.string(),
  hash: z.string().nullish(),
  lastModified: z.number(),
  eTag: z.string(),
  sizeBytes: z.number(),
  mimeType: z.string(),
  mediaType: z.nativeEnum(MediaType),
  // contentAttributes: ContentAttributesByHash
  // contentMetadata: ContentMetadataByHash
})

export class FolderObjectDTO extends createZodDto(folderObjectSchema) {}
