import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { folderObjectDTOSchema } from '../folder-object.dto'

export const folderObjectListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
    nextCursor: z.string().optional(),
    previousCursor: z.string().optional(),
  }),
  result: z.array(folderObjectDTOSchema),
})

export class FolderObjectListResponse extends createZodDto(
  folderObjectListResponseSchema,
) {}
