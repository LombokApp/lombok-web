import {
  elaboratedTargetLocationContextDTOSchema,
  LogEntryLevel,
  targetLocationContextDTOSchema,
} from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const logEntrytDTOSchema = z.object({
  id: z.guid(),
  message: z.string(),
  level: z.enum(LogEntryLevel),
  emitterIdentifier: z.string(),
  targetLocation: targetLocationContextDTOSchema.optional(),
  targetLocationContext: elaboratedTargetLocationContextDTOSchema.optional(),
  data: z.unknown(),
  createdAt: z.iso.datetime(),
})

export class LogEntryDTO extends createZodDto(logEntrytDTOSchema) {}

export const logEntrySchemaWithTargetLocationContextDTOSchema =
  logEntrytDTOSchema.extend({
    targetLocationContext: elaboratedTargetLocationContextDTOSchema.optional(),
  })

export class LogEntryWithTargetLocationContextDTO extends createZodDto(
  logEntrySchemaWithTargetLocationContextDTOSchema,
) {}
