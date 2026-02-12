import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { logEntrytDTOSchema } from '../log-entry.dto'

export const logGetResponseSchema = z.object({
  log: logEntrytDTOSchema,
})

export class LogGetResponse extends createZodDto(logGetResponseSchema) {}
