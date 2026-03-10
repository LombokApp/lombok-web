import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerRouteAppContainerRequestSchema = z.object({
  requestId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
})

export class DockerRouteAppContainerRequestDTO extends createZodDto(
  dockerRouteAppContainerRequestSchema,
) {}
