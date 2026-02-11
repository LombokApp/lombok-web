import { folderObjectSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const folderObjectGetResponseSchema = z.object({
  folderObject: folderObjectSchema,
})

export class FolderObjectGetResponse extends createZodDto(
  folderObjectGetResponseSchema,
) {}
