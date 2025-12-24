import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { eventSchemaWithTargetLocationContextDTOSchema } from '../event.dto'

export const eventGetResponseSchema = z.object({
  event: eventSchemaWithTargetLocationContextDTOSchema,
})

export class EventGetResponse extends createZodDto(eventGetResponseSchema) {}
