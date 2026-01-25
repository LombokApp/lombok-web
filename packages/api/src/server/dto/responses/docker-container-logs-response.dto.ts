import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const dockerContainerLogEntrySchema = z.object({
  stream: z.enum(['stdout', 'stderr']),
  text: z.string(),
})

export const dockerContainerLogsResponseSchema = z.object({
  entries: z.array(dockerContainerLogEntrySchema),
})

export class DockerContainerLogsResponse extends createZodDto(
  dockerContainerLogsResponseSchema,
) {}
