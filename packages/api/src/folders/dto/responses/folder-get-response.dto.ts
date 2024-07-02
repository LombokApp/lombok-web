import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { folderSchema } from '../folder.dto'

export const folderGetResponseSchema = z.object({
  folder: folderSchema,
  permissions: z.array(z.string()),
})

export class FolderGetResponse extends createZodDto(folderGetResponseSchema) {}
