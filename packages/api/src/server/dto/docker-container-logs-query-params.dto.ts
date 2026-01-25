import { createZodDto } from '@anatine/zod-nestjs'
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
