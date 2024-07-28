import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const folderHandleActionInputSchema = z.object({
  objectKey: z.string().optional(),
  actionParams: z.any().optional(),
})

export class FolderHandleActionInputDTO extends createZodDto(
  folderHandleActionInputSchema,
) {}
