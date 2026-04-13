import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerResourceConfigCloneInputSchema = z.object({
  label: z.string().min(1).max(128).optional(),
})

export class DockerResourceConfigCloneInputDTO extends createZodDto(
  dockerResourceConfigCloneInputSchema,
) {}
