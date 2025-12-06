import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const workerJobStartedResponseSchema = z.object({
  ok: z.boolean(),
})

export class WorkerJobStartedResponseDTO extends createZodDto(
  workerJobStartedResponseSchema,
) {}
