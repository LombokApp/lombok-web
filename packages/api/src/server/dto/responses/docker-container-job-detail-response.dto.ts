import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { dockerContainerLogEntrySchema } from './docker-container-logs-response.dto'

export const dockerContainerJobDetailResponseSchema = z.object({
  state: z.unknown().optional(),
  stateError: z.string().optional(),
  entries: z.array(dockerContainerLogEntrySchema).optional(),
  logError: z.string().optional(),
})

export class DockerContainerJobDetailResponse extends createZodDto(
  dockerContainerJobDetailResponseSchema,
) {}
