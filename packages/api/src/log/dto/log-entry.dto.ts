import { createZodDto } from '@anatine/zod-nestjs'
import {
  elaboratedTargetLocationContextDTOSchema,
  LogEntryLevel,
  targetLocationContextDTOSchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const logEntrytDTOSchema = z.object({
  id: z.string().uuid(),
  message: z.string(),
  level: z.nativeEnum(LogEntryLevel),
  emitterIdentifier: z.string(),
  targetLocation: targetLocationContextDTOSchema.optional(),
  targetLocationContext: elaboratedTargetLocationContextDTOSchema.optional(),
  data: z.unknown(),
  createdAt: z.string().datetime(),
})

export class LogEntryDTO extends createZodDto(logEntrytDTOSchema) {}

export const logEntrySchemaWithTargetLocationContextDTOSchema =
  logEntrytDTOSchema.extend({
    targetLocationContext: elaboratedTargetLocationContextDTOSchema.optional(),
  })

export class LogEntryWithTargetLocationContextDTO extends createZodDto(
  logEntrySchemaWithTargetLocationContextDTOSchema,
) {}
