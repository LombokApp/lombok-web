import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const verifyEmailSchema = z.object({
  token: z.string().min(1),
})

export class VerifyEmailDTO extends createZodDto(verifyEmailSchema) {}
