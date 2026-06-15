import { createZodDto } from 'nestjs-zod'
import { imageUrlsDTOSchema } from 'src/shared/dto/image-urls.dto'
import { z } from 'zod'

export const folderStarredListResponseSchema = z.object({
  folders: z.array(
    z.object({
      id: z.guid(),
      name: z.string(),
      icon: imageUrlsDTOSchema.optional(),
    }),
  ),
})

export class FolderStarredListResponse extends createZodDto(
  folderStarredListResponseSchema,
) {}
