import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const workerJobCompleteResponseSchema = z.object({
  ok: z.boolean(),
})

export class WorkerJobCompleteResponseDTO extends createZodDto(
  workerJobCompleteResponseSchema,
) {}
