import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { EventLevel } from '../entities/event.entity'

export const eventSchema = z.object({
  id: z.string().uuid(),
  eventKey: z.string(),
  level: z.nativeEnum(EventLevel),
  emitterIdentifier: z.string(),
  locationContext: z
    .object({
      folderId: z.string().uuid(),
      objectKey: z.string().optional(),
    })
    .optional(),
  data: z.any(),
  createdAt: z.date(),
})

export class EventDTO extends createZodDto(eventSchema) {}
