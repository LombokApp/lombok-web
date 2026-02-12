import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { FolderSort } from '../services/folder.service'

export const foldersListQueryParamsSchema = z.object({
  offset: z
    .preprocess(
      (a) => parseInt(a as string, 10),
      z.number().refine((a) => a > -1),
    )
    .optional(),
  limit: z
    .preprocess(
      (a) => parseInt(a as string, 10),
      z.number().refine((a) => a > 0),
    )
    .optional(),
  sort: z
    .array(z.enum(FolderSort))
    .or(z.enum(FolderSort).optional())
    .optional(),
  search: z.string().optional(),
})

export class FoldersListQueryParamsDTO extends createZodDto(
  foldersListQueryParamsSchema,
) {}
