import { createZodDto } from '@anatine/zod-nestjs'
import { FolderPermissionZodEnum } from '@stellariscloud/types'
import { z } from 'zod'

import { folderSchema } from '../folder.dto'

export const folderListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(
    z.object({
      permissions: z.array(FolderPermissionZodEnum),
      folder: folderSchema,
    }),
  ),
})

export class FolderListResponse extends createZodDto(
  folderListResponseSchema,
) {}
