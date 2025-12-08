import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { eventSchemaWithTargetLocationContext } from '../event.dto'

export const eventGetResponseSchema = z.object({
  event: eventSchemaWithTargetLocationContext,
})

export class EventGetResponse extends createZodDto(eventGetResponseSchema) {}
