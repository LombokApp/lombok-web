import { createZodDto } from '@anatine/zod-nestjs'
import { subjectContextSchema } from '@lombokapp/types'
import { z } from 'zod'

import { LogEntryLevel } from '../entities/log-entry.entity'

export const logEntrySchema = z.object({
  id: z.string().uuid(),
  message: z.string(),
  level: z.nativeEnum(LogEntryLevel),
  emitterIdentifier: z.string(),
  subjectContext: subjectContextSchema.optional(),
  data: z.unknown(),
  createdAt: z.date(),
})

export class LogEntryDTO extends createZodDto(logEntrySchema) {}
