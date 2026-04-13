import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerHostInputSchema = z.object({
  identifier: z
    .string()
    .min(1)
    .max(64)
    .regex(/^[a-z][a-z0-9_-]*$/),
  label: z.string().min(1).max(128),
  type: z.enum(['docker_endpoint']),
  host: z.string().min(1),
  tlsConfig: z
    .object({
      ca: z.string().optional(),
      cert: z.string().optional(),
      key: z.string().optional(),
    })
    .optional(),
  isDefault: z.boolean().optional(),
  enabled: z.boolean().optional(),
})

export class DockerHostInputDTO extends createZodDto(dockerHostInputSchema) {}

export const dockerHostUpdateSchema = dockerHostInputSchema.partial()

export class DockerHostUpdateDTO extends createZodDto(dockerHostUpdateSchema) {}
