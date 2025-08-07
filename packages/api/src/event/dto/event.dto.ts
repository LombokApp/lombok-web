import { createZodDto } from '@anatine/zod-nestjs'
import { subjectContextSchema } from '@stellariscloud/types'
import { z } from 'zod'

export const eventSchema = z.object({
  id: z.string().uuid(),
  eventKey: z.string(),
  emitterIdentifier: z.string(),
  subjectContext: subjectContextSchema.optional(),
  data: z.unknown(),
  createdAt: z.date(),
})

export class EventDTO extends createZodDto(eventSchema) {}
