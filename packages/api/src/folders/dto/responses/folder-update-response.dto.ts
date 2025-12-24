import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { folderDTOSchema } from '../folder.dto'

export const folderUpdateResponseSchema = z.object({
  folder: folderDTOSchema,
})

export class FolderUpdateResponseDTO extends createZodDto(
  folderUpdateResponseSchema,
) {}
