import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const eventSchema = z.object({
  id: z.string(),
  eventKey: z.string(),
  data: z.object({
    folderId: z.string(),
    objectKey: z.string().optional(),
  }),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export class EventDTO extends createZodDto(eventSchema) {}
