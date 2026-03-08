import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerRefreshContainerTokenResponseSchema = z.object({
  token: z.string(),
})

export class DockerRefreshContainerTokenResponseDTO extends createZodDto(
  dockerRefreshContainerTokenResponseSchema,
) {}
