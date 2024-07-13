import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const folderObjectsListQueryParamsSchema = z.object({
  offset: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().positive(),
  ),
  limit: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().positive(),
  ),
  search: z.string().optional(),
})

export class FolderObjectsListQueryParamsDTO extends createZodDto(
  folderObjectsListQueryParamsSchema,
) {}
