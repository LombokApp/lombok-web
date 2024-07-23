import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const logEntrySchema = z.object({
  id: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export class LogEntryDTO extends createZodDto(logEntrySchema) {}
