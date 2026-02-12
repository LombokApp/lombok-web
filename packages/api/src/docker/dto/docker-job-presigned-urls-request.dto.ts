import { SignedURLsRequestMethod } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerJobPresignedUrlsRequestSchema = z.array(
  z.object({
    folderId: z.guid(),
    objectKey: z.string().min(1),
    method: z.enum(SignedURLsRequestMethod),
  }),
)

export class DockerJobPresignedUrlsRequestDTO extends createZodDto(
  dockerJobPresignedUrlsRequestSchema,
) {}
