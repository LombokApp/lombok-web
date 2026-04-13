import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { dockerResourceConfigDataSchema } from './docker-resource-config-input.dto'

export const dockerStandaloneContainerInputSchema = z.object({
  dockerHostId: z.uuid(),
  label: z.string().min(1).max(128),
  image: z.string().min(1),
  tag: z.string().min(1).default('latest'),
  desiredStatus: z.enum(['running', 'stopped']).default('stopped'),
  ports: z
    .array(
      z.object({
        host: z.number().positive().max(65535),
        container: z.number().positive().max(65535),
        protocol: z.enum(['tcp', 'udp']).default('tcp'),
      }),
    )
    .default([]),
  config: dockerResourceConfigDataSchema.default({}),
})

export class DockerStandaloneContainerInputDTO extends createZodDto(
  dockerStandaloneContainerInputSchema,
) {}

export const dockerStandaloneContainerUpdateSchema =
  dockerStandaloneContainerInputSchema.partial()

export class DockerStandaloneContainerUpdateDTO extends createZodDto(
  dockerStandaloneContainerUpdateSchema,
) {}
