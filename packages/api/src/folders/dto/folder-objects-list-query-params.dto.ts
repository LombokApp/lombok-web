import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const folderObjectsListQueryParamsSchema = z.object({
  offset: z
    .preprocess((a) => parseInt(a as string, 10), z.number().positive())
    .optional(),
  limit: z
    .preprocess((a) => parseInt(a as string, 10), z.number().positive())
    .optional(),
  search: z.string().optional(),
})

export class FolderObjectsListQueryParamsDTO extends createZodDto(
  folderObjectsListQueryParamsSchema,
) {}
