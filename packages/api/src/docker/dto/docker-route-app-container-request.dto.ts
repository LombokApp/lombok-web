import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerRouteAppContainerRequestSchema = z.object({
  requestId: z.string().regex(/^[a-zA-Z0-9_-]+$/),
  callerSubPath: z
    .string()
    .regex(/^[a-zA-Z0-9_-]+$/)
    .optional(),
})

export class DockerRouteAppContainerRequestDTO extends createZodDto(
  dockerRouteAppContainerRequestSchema,
) {}
