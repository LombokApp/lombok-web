import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { logEntrySchema } from '../log-entry.dto'

export const logEntryGetResponseSchema = z.object({
  event: logEntrySchema,
})

export class LogEntryGetResponse extends createZodDto(
  logEntryGetResponseSchema,
) {}
