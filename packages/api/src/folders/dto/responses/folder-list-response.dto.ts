import { createZodDto } from '@anatine/zod-nestjs'
import { FolderPermissionEnum } from '@stellariscloud/types'
import { z } from 'zod'

import { folderSchema } from '../folder.dto'

export const folderListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(
    z.object({
      permissions: z.array(z.nativeEnum(FolderPermissionEnum)),
      folder: folderSchema,
    }),
  ),
})

export class FolderListResponse extends createZodDto(
  folderListResponseSchema,
) {}
