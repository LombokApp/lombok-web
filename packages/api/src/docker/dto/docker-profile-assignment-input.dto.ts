import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerProfileAssignmentInputSchema = z.object({
  dockerResourceConfigId: z.uuid(),
  appIdentifier: z.string().min(1),
  profileKey: z
    .string()
    .min(1)
    .regex(/^[a-z_]+$/),
})

export class DockerProfileAssignmentInputDTO extends createZodDto(
  dockerProfileAssignmentInputSchema,
) {}

export const dockerProfileAssignmentUpdateSchema = z.object({
  dockerResourceConfigId: z.uuid(),
})

export class DockerProfileAssignmentUpdateDTO extends createZodDto(
  dockerProfileAssignmentUpdateSchema,
) {}
