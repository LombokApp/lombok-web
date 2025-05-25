import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const folderShareUsersListQueryParamsSchema = z.object({
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
  search: z.string().optional(),
})

export class FolderShareUsersListQueryParamsDTO extends createZodDto(
  folderShareUsersListQueryParamsSchema,
) {}
