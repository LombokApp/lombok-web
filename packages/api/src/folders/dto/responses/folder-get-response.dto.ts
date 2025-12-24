import { createZodDto } from '@anatine/zod-nestjs'
import { FolderPermissionZodEnum } from '@lombokapp/types'
import { z } from 'zod'

import { folderDTOSchema } from '../folder.dto'

export const folderGetResponseSchema = z.object({
  folder: folderDTOSchema,
  permissions: z.array(FolderPermissionZodEnum),
})

export class FolderGetResponse extends createZodDto(folderGetResponseSchema) {}
