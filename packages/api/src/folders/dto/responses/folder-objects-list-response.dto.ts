import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { folderObjectSchema } from '../folder-object.dto'

export const folderObjectsListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(folderObjectSchema),
})

export class FolderObjectsListResponse extends createZodDto(
  folderObjectsListResponseSchema,
) {}
