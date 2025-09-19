import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const ssoCallbackSchema = z.object({
  code: z.string(),
})

export class SSOCallbackDTO extends createZodDto(ssoCallbackSchema) {}
