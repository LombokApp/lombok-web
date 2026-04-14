import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerStandaloneContainerListQueryParamsSchema = z.object({
  dockerHostId: z.string().uuid().optional(),
})

export class DockerStandaloneContainerListQueryParamsDTO extends createZodDto(
  dockerStandaloneContainerListQueryParamsSchema,
) {}
