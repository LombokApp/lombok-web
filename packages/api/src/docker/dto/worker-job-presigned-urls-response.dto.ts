import { createZodDto } from '@anatine/zod-nestjs'
import { SignedURLsRequestMethod } from '@lombokapp/types'
import { z } from 'zod'

export const workerJobPresignedUrlsResponseSchema = z.object({
  urls: z.array(
    z.object({
      folderId: z.string().uuid(),
      objectKey: z.string(),
      method: z.nativeEnum(SignedURLsRequestMethod),
      url: z.string().url(),
    }),
  ),
})

export class WorkerJobPresignedUrlsResponseDTO extends createZodDto(
  workerJobPresignedUrlsResponseSchema,
) {}
