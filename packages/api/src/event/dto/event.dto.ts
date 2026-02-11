import {
  elaboratedTargetLocationContextDTOSchema,
  jsonSerializableObjectSchema,
  targetLocationContextDTOSchema,
} from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const eventDTOSchema = z.object({
  id: z.guid(),
  eventIdentifier: z.string(),
  emitterIdentifier: z.string(),
  targetLocationContext: elaboratedTargetLocationContextDTOSchema.optional(),
  data: jsonSerializableObjectSchema,
  targetLocation: targetLocationContextDTOSchema.optional(),
  createdAt: z.iso.datetime(),
})

export class EventDTO extends createZodDto(eventDTOSchema) {}

export const eventSchemaWithTargetLocationContextDTOSchema =
  eventDTOSchema.extend({
    targetLocationContext: elaboratedTargetLocationContextDTOSchema.optional(),
  })

export class EventWithTargetLocationContextDTO extends createZodDto(
  eventSchemaWithTargetLocationContextDTOSchema,
) {}
