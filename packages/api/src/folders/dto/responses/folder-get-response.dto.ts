import { createZodDto } from '@anatine/zod-nestjs'
import { FolderPermissionZodEnum } from '@lombokapp/types'
import { z } from 'zod'

import { folderSchema } from '../folder.dto'

export const folderGetResponseSchema = z.object({
  folder: folderSchema,
  permissions: z.array(FolderPermissionZodEnum),
})

export class FolderGetResponse extends createZodDto(folderGetResponseSchema) {}
