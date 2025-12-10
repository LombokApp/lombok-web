import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { folderObjectDTOSchema } from '../folder-object.dto'

export const folderObjectGetResponseSchema = z.object({
  folderObject: folderObjectDTOSchema,
})

export class FolderObjectGetResponse extends createZodDto(
  folderObjectGetResponseSchema,
) {}
