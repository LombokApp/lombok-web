import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { logEntrySchema } from '../log-entry.dto'

export const logGetResponseSchema = z.object({
  log: logEntrySchema,
})

export class LogGetResponse extends createZodDto(logGetResponseSchema) {}
