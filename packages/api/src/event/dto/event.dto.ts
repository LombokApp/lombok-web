import { createZodDto } from '@anatine/zod-nestjs'
import {
  jsonSerializableObjectSchema,
  subjectContextSchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const eventSchema = z.object({
  id: z.string().uuid(),
  eventIdentifier: z.string(),
  emitterIdentifier: z.string(),
  subjectContext: subjectContextSchema.optional(),
  data: jsonSerializableObjectSchema,
  createdAt: z.date(),
})

export class EventDTO extends createZodDto(eventSchema) {}
