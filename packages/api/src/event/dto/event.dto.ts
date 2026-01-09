import { createZodDto } from '@anatine/zod-nestjs'
import {
  elaboratedTargetLocationContextDTOSchema,
  jsonSerializableObjectSchema,
  targetLocationContextDTOSchema,
} from '@lombokapp/types'
import { z } from 'zod'

export const eventDTOSchema = z.object({
  id: z.string().uuid(),
  eventIdentifier: z.string(),
  emitterIdentifier: z.string(),
  targetLocationContext: elaboratedTargetLocationContextDTOSchema.optional(),
  data: jsonSerializableObjectSchema,
  targetLocation: targetLocationContextDTOSchema.optional(),
  createdAt: z.string().datetime(),
})

export class EventDTO extends createZodDto(eventDTOSchema) {}

export const eventSchemaWithTargetLocationContextDTOSchema =
  eventDTOSchema.extend({
    targetLocationContext: elaboratedTargetLocationContextDTOSchema.optional(),
  })

export class EventWithTargetLocationContextDTO extends createZodDto(
  eventSchemaWithTargetLocationContextDTOSchema,
) {}
