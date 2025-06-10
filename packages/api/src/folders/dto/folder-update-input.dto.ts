import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const folderUpdateInputSchema = z.object({
  name: z.string().max(256).nonempty(),
})

export class FolderUpdateInputDTO extends createZodDto(
  folderUpdateInputSchema,
) {}
