import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerResourceConfigListQueryParamsSchema = z.object({
  dockerHostId: z.string().uuid().optional(),
})

export class DockerResourceConfigListQueryParamsDTO extends createZodDto(
  dockerResourceConfigListQueryParamsSchema,
) {}
