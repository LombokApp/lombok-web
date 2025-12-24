import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { folderDTOSchema } from '../folder.dto'

export const folderCreateResponseSchema = z.object({
  folder: folderDTOSchema,
})

export class FolderCreateResponse extends createZodDto(
  folderCreateResponseSchema,
) {}
