import { createZodDto } from '@anatine/zod-nestjs'
import { FolderPermissionZodEnum } from '@stellariscloud/types'
import { z } from 'zod'

export const folderShareSchema = z.object({
  userId: z.string().uuid(),
  permissions: z.array(FolderPermissionZodEnum),
})

export class FolderShareDTO extends createZodDto(folderShareSchema) {}
