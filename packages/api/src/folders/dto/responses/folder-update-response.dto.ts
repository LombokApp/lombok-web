import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { folderSchema } from '../folder.dto'

export const folderUpdateResponseSchema = z.object({
  folder: folderSchema,
})

export class FolderUpdateResponseDTO extends createZodDto(
  folderUpdateResponseSchema,
) {}
