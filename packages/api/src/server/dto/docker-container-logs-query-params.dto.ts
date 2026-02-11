import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerContainerLogsQueryParamsSchema = z.object({
  tail: z
    .preprocess(
      (value) => (value === undefined ? undefined : Number(value)),
      z.number().int().positive(),
    )
    .optional(),
})

export class DockerContainerLogsQueryParamsDTO extends createZodDto(
  dockerContainerLogsQueryParamsSchema,
) {}
