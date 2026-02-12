import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerContainerActionResponseSchema = z.object({
  success: z.literal(true),
})

export class DockerContainerActionResponse extends createZodDto(
  dockerContainerActionResponseSchema,
) {}
