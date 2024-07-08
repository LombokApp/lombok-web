import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { folderObjectSchema } from '../folder-object.dto'

export const folderObjectGetResponseSchema = z.object({
  folderObject: folderObjectSchema,
})

export class FolderObjectGetResponse extends createZodDto(
  folderObjectGetResponseSchema,
) {}
