import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerSessionsListQueryParamsSchema = z.object({
  appId: z.string().optional(),
  containerId: z.string().optional(),
})

export class DockerSessionsListQueryParamsDTO extends createZodDto(
  dockerSessionsListQueryParamsSchema,
) {}
