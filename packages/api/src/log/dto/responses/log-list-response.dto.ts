import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { logEntrytDTOSchema } from '../log-entry.dto'

export const logListResponseSchema = z.object({
  result: z.array(logEntrytDTOSchema),
  meta: z.object({
    totalCount: z.number(),
  }),
})

export class LogListResponse extends createZodDto(logListResponseSchema) {}
