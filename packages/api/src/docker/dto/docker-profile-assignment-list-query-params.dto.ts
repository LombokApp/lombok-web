import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const dockerProfileAssignmentListQueryParamsSchema = z.object({
  appIdentifier: z.string().optional(),
})

export class DockerProfileAssignmentListQueryParamsDTO extends createZodDto(
  dockerProfileAssignmentListQueryParamsSchema,
) {}
