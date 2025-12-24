import { createZodDto } from '@anatine/zod-nestjs'
import { FolderPermissionZodEnum } from '@lombokapp/types'
import { z } from 'zod'

import { folderDTOSchema } from '../folder.dto'

export const folderListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(
    z.object({
      permissions: z.array(FolderPermissionZodEnum),
      folder: folderDTOSchema,
    }),
  ),
})

export class FolderListResponse extends createZodDto(
  folderListResponseSchema,
) {}
