import { FolderPermissionZodEnum } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const folderShareCreateInputSchema = z.object({
  permissions: z.array(FolderPermissionZodEnum),
})

export class FolderShareCreateInputDTO extends createZodDto(
  folderShareCreateInputSchema,
) {}
