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
  sort: z
    .array(z.nativeEnum(FolderObjectSort))
    .or(z.nativeEnum(FolderObjectSort).optional())
    .optional(),
  includeImage: z.literal('true').optional(),
  includeVideo: z.literal('true').optional(),
  includeAudio: z.literal('true').optional(),
  includeDocument: z.literal('true').optional(),
  includeUnknown: z.literal('true').optional(),
})

export class FolderObjectsListQueryParamsDTO extends createZodDto(
  folderObjectsListQueryParamsSchema,
) {}
