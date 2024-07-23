import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { logEntrySchema } from '../log-entry.dto'

export const logEntryListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(logEntrySchema),
})

export class LogEntryListResponse extends createZodDto(
  logEntryListResponseSchema,
) {}
