import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const folderShareCreateInputSchema = z.object({
  permissions: z.array(z.string()),
})

export class FolderShareCreateInputDTO extends createZodDto(
  folderShareCreateInputSchema,
) {}
