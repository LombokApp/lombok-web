import { createZodDto } from '@anatine/zod-nestjs'
import {
  elaboratedTargetLocationContextSchema,
  jsonSerializableObjectSchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const eventSchema = z.object({
  id: z.string().uuid(),
  eventIdentifier: z.string(),
  emitterIdentifier: z.string(),
  subjectContext: elaboratedTargetLocationContextSchema.optional(),
  data: jsonSerializableObjectSchema,
  createdAt: z.string().datetime(),
})

export class EventDTO extends createZodDto(eventSchema) {}

export const eventSchemaWithTargetLocationContext = eventSchema.extend({
  targetLocationContext: elaboratedTargetLocationContextSchema.optional(),
})

export class EventWithTargetLocationContextDTO extends createZodDto(
  eventSchemaWithTargetLocationContext,
) {}
