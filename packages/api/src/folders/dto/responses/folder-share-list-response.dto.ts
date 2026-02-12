import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { folderShareSchema } from '../folder-share.dto'

export const folderShareListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(folderShareSchema),
})

export class FolderShareListResponse extends createZodDto(
  folderShareListResponseSchema,
) {}
