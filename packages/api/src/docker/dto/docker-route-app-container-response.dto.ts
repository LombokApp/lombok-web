import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerRouteAppContainerResponseSchema = z.object({
  status: z.number(),
  headers: z.record(z.string(), z.string()),
  body: z.unknown(),
})

export class DockerRouteAppContainerResponseDTO extends createZodDto(
  dockerRouteAppContainerResponseSchema,
) {}
