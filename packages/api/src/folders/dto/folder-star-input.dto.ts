import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const folderStarInputSchema = z.object({
  starred: z.boolean(),
})

export class FolderStarInputDTO extends createZodDto(folderStarInputSchema) {}
