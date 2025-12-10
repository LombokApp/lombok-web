import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { eventDTOSchema } from '../event.dto'

export const eventListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(eventDTOSchema),
})

export class EventListResponse extends createZodDto(eventListResponseSchema) {}
