import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { LogLevel } from '../entities/log-entry.entity'

export const logEntrySchema = z.object({
  id: z.string().uuid(),
  message: z.string(),
  level: z.nativeEnum(LogLevel),
  emitterIdentifier: z.string(),
  locationContext: z
    .object({
      folderId: z.string().uuid(),
      objectKey: z.string().optional(),
    })
    .optional(),
  data: z.unknown(),
  createdAt: z.date(),
})

export class LogEntryDTO extends createZodDto(logEntrySchema) {}
