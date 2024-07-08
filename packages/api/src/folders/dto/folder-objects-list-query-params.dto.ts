import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const folderObjectsListQueryParamsSchema = z.object({
  offset: z.number().optional(),
  limit: z.number().optional(),
  search: z.string().optional(),
})

export class FolderObjectsListQueryParamsDTO extends createZodDto(
  folderObjectsListQueryParamsSchema,
) {}
