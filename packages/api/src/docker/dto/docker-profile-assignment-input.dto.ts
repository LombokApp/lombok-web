import { dockerResourceConfigDataSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerProfileAssignmentInputSchema = z.object({
  appIdentifier: z.string().min(1),
  profileKey: z
    .string()
    .min(1)
    .regex(/^[a-z_]+$/),
  dockerHostId: z.uuid(),
  config: dockerResourceConfigDataSchema.default({}),
})

export class DockerProfileAssignmentInputDTO extends createZodDto(
  dockerProfileAssignmentInputSchema,
) {}

export const dockerProfileAssignmentUpdateSchema = z.object({
  dockerHostId: z.uuid().optional(),
  config: dockerResourceConfigDataSchema.optional(),
})

export class DockerProfileAssignmentUpdateDTO extends createZodDto(
  dockerProfileAssignmentUpdateSchema,
) {}
