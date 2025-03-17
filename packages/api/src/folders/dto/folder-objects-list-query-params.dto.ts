import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'
import { FolderObjectSort } from '../services/folder.service'

export const folderObjectsListQueryParamsSchema = z.object({
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
  sort: z.nativeEnum(FolderObjectSort).optional(),
})

export class FolderObjectsListQueryParamsDTO extends createZodDto(
  folderObjectsListQueryParamsSchema,
) {}
