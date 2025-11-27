import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const workerJobUploadUrlsResponseSchema = z.object({
  uploads: z.array(
    z.object({
      folderId: z.string().uuid(),
      objectKey: z.string(),
      presignedUrl: z.string().url(),
    }),
  ),
})

export class WorkerJobUploadUrlsResponseDTO extends createZodDto(
  workerJobUploadUrlsResponseSchema,
) {}
