import { createZodDto } from '@anatine/zod-nestjs'
import { folderObjectSchema } from '@lombokapp/types'
import { z } from 'zod'

export const folderObjectGetResponseSchema = z.object({
  folderObject: folderObjectSchema,
})

export class FolderObjectGetResponse extends createZodDto(
  folderObjectGetResponseSchema,
) {}
