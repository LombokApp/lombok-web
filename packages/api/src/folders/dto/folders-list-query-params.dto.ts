import { createZodDto } from '@anatine/zod-nestjs'
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
    .preprocess((a) => parseInt(a as string, 10), z.number().positive())
    .optional(),
  sort: z.nativeEnum(FolderSort).optional(),
  search: z.string().optional(),
})

export class FoldersListQueryParamsDTO extends createZodDto(
  foldersListQueryParamsSchema,
) {}
