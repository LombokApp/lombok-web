import { createZodDto } from '@anatine/zod-nestjs'
import { SignedURLsRequestMethod } from '@lombokapp/types'
import { z } from 'zod'

export const workerJobUploadUrlsRequestSchema = z.array(
  z.object({
    folderId: z.string().uuid(),
    objectKey: z.string().min(1),
    method: z.nativeEnum(SignedURLsRequestMethod),
  }),
)

export class WorkerJobUploadUrlsRequestDTO extends createZodDto(
  workerJobUploadUrlsRequestSchema,
) {}
