import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const dockerContainerWorkerSummarySchema = z.object({
  workerId: z.string(),
  port: z.number().int().positive(),
  filePath: z.string(),
})

export const dockerContainerWorkersResponseSchema = z.object({
  workers: z.array(dockerContainerWorkerSummarySchema),
})

export class DockerContainerWorkersResponse extends createZodDto(
  dockerContainerWorkersResponseSchema,
) {}
