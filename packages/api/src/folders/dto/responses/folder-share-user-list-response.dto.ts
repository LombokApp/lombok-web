import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const folderShareUserListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(
    z.object({
      username: z.string(),
      id: z.string(),
    }),
  ),
})

export class FolderShareUserListResponse extends createZodDto(
  folderShareUserListResponseSchema,
) {}
