import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { logEntrytDTOSchema } from '../log-entry.dto'

export const logGetResponseSchema = z.object({
  log: logEntrytDTOSchema,
})

export class LogGetResponse extends createZodDto(logGetResponseSchema) {}
