import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const workerJobCompleteRequestSchema = z.object({
  success: z.boolean(),
  result: z.unknown().optional(),
  error: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
  uploadedFiles: z
    .array(
      z.object({
        folderId: z.string().uuid(),
        objectKey: z.string().min(1),
      }),
    )
    .optional(),
})

export class WorkerJobCompleteRequestDTO extends createZodDto(
  workerJobCompleteRequestSchema,
) {}
