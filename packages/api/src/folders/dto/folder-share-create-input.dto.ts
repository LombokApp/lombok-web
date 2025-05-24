import { createZodDto } from '@anatine/zod-nestjs'
import { FolderPermissionZodEnum } from '@stellariscloud/types'
import { z } from 'zod'

export const folderShareCreateInputSchema = z.object({
  permissions: z.array(FolderPermissionZodEnum),
})

export class FolderShareCreateInputDTO extends createZodDto(
  folderShareCreateInputSchema,
) {}
