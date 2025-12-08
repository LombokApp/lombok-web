import { createZodDto } from '@anatine/zod-nestjs'
import {
  elaboratedTargetLocationContextSchema,
  LogEntryLevel,
  targetLocationContextSchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const logEntrySchema = z.object({
  id: z.string().uuid(),
  message: z.string(),
  level: z.nativeEnum(LogEntryLevel),
  emitterIdentifier: z.string(),
  targetLocation: targetLocationContextSchema.optional(),
  targetLocationContext: elaboratedTargetLocationContextSchema.optional(),
  data: z.unknown(),
  createdAt: z.date(),
})

export class LogEntryDTO extends createZodDto(logEntrySchema) {}
