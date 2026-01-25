import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const dockerContainerPurgeJobsQueryParamsSchema = z.object({
  olderThan: z.string().optional(),
})

export class DockerContainerPurgeJobsQueryParamsDTO extends createZodDto(
  dockerContainerPurgeJobsQueryParamsSchema,
) {}
