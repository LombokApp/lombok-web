import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerStandaloneContainerInputSchema = z.object({
  dockerResourceConfigId: z.uuid(),
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
})

export class DockerStandaloneContainerInputDTO extends createZodDto(
  dockerStandaloneContainerInputSchema,
) {}

export const dockerStandaloneContainerUpdateSchema =
  dockerStandaloneContainerInputSchema
    .omit({ dockerResourceConfigId: true })
    .partial()
    .extend({
      dockerResourceConfigId: z.uuid().optional(),
    })

export class DockerStandaloneContainerUpdateDTO extends createZodDto(
  dockerStandaloneContainerUpdateSchema,
) {}
