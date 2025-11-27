import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const workerJobUploadUrlsRequestSchema = z.object({
  files: z.array(
    z.object({
      folderId: z.string().uuid(),
      objectKey: z.string().min(1),
      contentType: z.string().min(1),
    }),
  ),
})

export class WorkerJobUploadUrlsRequestDTO extends createZodDto(
  workerJobUploadUrlsRequestSchema,
) {}
