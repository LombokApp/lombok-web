import { createZodDto } from '@anatine/zod-nestjs'
import { SignedURLsRequestMethod } from '@lombokapp/types'
import { z } from 'zod'

export const dockerJobPresignedUrlsRequestSchema = z.array(
  z.object({
    folderId: z.string().uuid(),
    objectKey: z.string().min(1),
    method: z.nativeEnum(SignedURLsRequestMethod),
  }),
)

export class DockerJobPresignedUrlsRequestDTO extends createZodDto(
  dockerJobPresignedUrlsRequestSchema,
) {}
