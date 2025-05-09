import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const folderShareSchema = z.object({
  userId: z.string().uuid(),
  permissions: z.array(z.string()),
})

export class FolderShareDTO extends createZodDto(folderShareSchema) {}
