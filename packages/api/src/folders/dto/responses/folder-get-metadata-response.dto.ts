import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const folderGetMetadataResponseSchema = z.object({
  totalCount: z.number().int(),
  totalSizeBytes: z.string(),
})

export class FolderGetMetadataResponse extends createZodDto(
  folderGetMetadataResponseSchema,
) {}
