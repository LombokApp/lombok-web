import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { folderSchema } from '../folder.dto'

export const folderCreateResponseSchema = z.object({
  folder: folderSchema,
})

export class FolderCreateResponse extends createZodDto(
  folderCreateResponseSchema,
) {}
