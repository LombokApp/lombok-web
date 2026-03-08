import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerRouteAppContainerRequestSchema = z.object({
  containerHostId: z.string(),
  containerId: z.string(),
  requestId: z.string(),
})

export class DockerRouteAppContainerRequestDTO extends createZodDto(
  dockerRouteAppContainerRequestSchema,
) {}
