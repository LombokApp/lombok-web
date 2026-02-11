import { FolderPermissionZodEnum } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const folderShareSchema = z.object({
  userId: z.guid(),
  permissions: z.array(FolderPermissionZodEnum),
})

export class FolderShareDTO extends createZodDto(folderShareSchema) {}
