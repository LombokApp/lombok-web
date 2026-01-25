import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const dockerContainerJobLogsQueryParamsSchema = z.object({
  tail: z
    .preprocess(
      (value) => (value === undefined ? undefined : Number(value)),
      z.number().int().positive(),
    )
    .optional(),
})

export class DockerContainerJobLogsQueryParamsDTO extends createZodDto(
  dockerContainerJobLogsQueryParamsSchema,
) {}
