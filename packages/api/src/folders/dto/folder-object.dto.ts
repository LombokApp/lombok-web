import { createZodDto } from '@anatine/zod-nestjs'
import { MediaType } from '@stellariscloud/types'
import { z } from 'zod'

import { folderObjectContentAttributesSchema } from './folder-object-content-attributes.dto'
import { folderObjectContentMetadataSchema } from './folder-object-content-metadata.dto'

export const folderObjectSchema = z.object({
  id: z.string(),
  objectKey: z.string(),
  folderId: z.string(),
  hash: z.string().optional(),
  lastModified: z.number(),
  eTag: z.string(),
  sizeBytes: z.number(),
  mimeType: z.string(),
  mediaType: z.nativeEnum(MediaType),
  contentAttributes: z.record(
    z.string(),
    folderObjectContentAttributesSchema.optional(),
  ),
  contentMetadata: z.record(
    z.string(),
    folderObjectContentMetadataSchema.optional(),
  ),
})

export class FolderObjectDTO extends createZodDto(folderObjectSchema) {}
