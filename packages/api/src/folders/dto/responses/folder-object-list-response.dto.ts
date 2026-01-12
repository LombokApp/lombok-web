import { createZodDto } from '@anatine/zod-nestjs'
import { folderObjectSchema } from '@lombokapp/types'
import { z } from 'zod'

export const folderObjectListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
    nextCursor: z.string().optional(),
    previousCursor: z.string().optional(),
  }),
  result: z.array(folderObjectSchema),
})

export class FolderObjectListResponse extends createZodDto(
  folderObjectListResponseSchema,
) {}
