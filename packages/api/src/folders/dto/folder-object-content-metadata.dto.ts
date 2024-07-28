import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const folderObjectContentMetadataSchema = z.record(
  z.string(),
  z
    .object({
      mimeType: z.string(),
      size: z.number(),
      hash: z.string(),
    })
    .optional(),
)

export class FolderObjectContentMetadataDTO extends createZodDto(
  folderObjectContentMetadataSchema,
) {}
