import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { eventSchema } from '../event.dto'

export const eventListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(eventSchema),
})

export class EventListResponse extends createZodDto(eventListResponseSchema) {}
