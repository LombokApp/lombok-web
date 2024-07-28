import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { eventSchema } from '../event.dto'

export const eventGetResponseSchema = z.object({
  event: eventSchema,
})

export class EventGetResponse extends createZodDto(eventGetResponseSchema) {}
