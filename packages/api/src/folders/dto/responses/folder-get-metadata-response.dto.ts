import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const folderGetMetadataResponseSchema = z.object({
  totalCount: z.number(),
  totalSizeBytes: z.number(),
})

export class FolderGetMetadataResponse extends createZodDto(
  folderGetMetadataResponseSchema,
) {}
