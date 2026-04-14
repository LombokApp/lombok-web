import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { dockerResourceConfigDataSchema } from './docker-resource-config-input.dto'

export const dockerStandaloneContainerInputSchema = z.object({
  dockerHostId: z.uuid(),
  label: z.string().min(1).max(128),
  image: z.string().min(1),
  tag: z.string().min(1).default('latest'),
  desiredStatus: z.enum(['running', 'stopped']).default('stopped'),
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

export const dockerStandaloneContainerDesiredStatusSchema = z.object({
  desiredStatus: z.enum(['running', 'stopped']),
})

export class DockerStandaloneContainerDesiredStatusDTO extends createZodDto(
  dockerStandaloneContainerDesiredStatusSchema,
) {}
