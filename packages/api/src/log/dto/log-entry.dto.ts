import { createZodDto } from '@anatine/zod-nestjs'
import { baseSubjectContextSchema } from '@stellariscloud/types'
import { z } from 'zod'

import { LogLevel } from '../entities/log-entry.entity'

export const logEntrySchema = z.object({
  id: z.string().uuid(),
  message: z.string(),
  level: z.nativeEnum(LogLevel),
  emitterIdentifier: z.string(),
  subjectContext: baseSubjectContextSchema.optional(),
  data: z.unknown(),
  createdAt: z.date(),
})

export class LogEntryDTO extends createZodDto(logEntrySchema) {}
