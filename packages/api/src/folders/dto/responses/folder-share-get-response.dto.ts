import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { folderShareSchema } from '../folder-share.dto'

export const folderShareGetResponseSchema = z.object({
  share: folderShareSchema,
})

export class FolderShareGetResponse extends createZodDto(
  folderShareGetResponseSchema,
) {}
