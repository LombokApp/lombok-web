import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const dockerContainerJobsQueryParamsSchema = z.object({
  limit: z
    .preprocess(
      (value) => (value === undefined ? undefined : Number(value)),
      z.number().int().positive(),
    )
    .optional(),
})

export class DockerContainerJobsQueryParamsDTO extends createZodDto(
  dockerContainerJobsQueryParamsSchema,
) {}
