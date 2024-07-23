import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const logEntrySchema = z.object({
  id: z.string(),
  name: z.string(),
  appIdentifier: z.string(),
  message: z.string(),
  data: z.any(),
  level: z.string(),
  createdAt: z.date(),
})

export class LogEntryDTO extends createZodDto(logEntrySchema) {}
