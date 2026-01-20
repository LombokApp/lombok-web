import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const dockerContainerJobSummarySchema = z.object({
  jobId: z.string(),
  filePath: z.string(),
})

export const dockerContainerJobsResponseSchema = z.object({
  jobs: z.array(dockerContainerJobSummarySchema),
})

export class DockerContainerJobsResponse extends createZodDto(
  dockerContainerJobsResponseSchema,
) {}
