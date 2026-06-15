import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const folderStarResponseSchema = z.object({
  starred: z.boolean(),
})

export class FolderStarResponse extends createZodDto(
  folderStarResponseSchema,
) {}
