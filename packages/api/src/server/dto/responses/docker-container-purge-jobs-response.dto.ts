import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const dockerContainerPurgeJobsResponseSchema = z.object({
  message: z.string(),
})

export class DockerContainerPurgeJobsResponse extends createZodDto(
  dockerContainerPurgeJobsResponseSchema,
) {}
