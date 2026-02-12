import { SignedURLsRequestMethod } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerJobPresignedUrlsResponseSchema = z.object({
  urls: z.array(
    z.object({
      folderId: z.guid(),
      objectKey: z.string(),
      method: z.enum(SignedURLsRequestMethod),
      url: z.url(),
    }),
  ),
})

export class DockerJobPresignedUrlsResponseDTO extends createZodDto(
  dockerJobPresignedUrlsResponseSchema,
) {}
