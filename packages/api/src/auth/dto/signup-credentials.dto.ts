import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const signupCredentialsSchema = z.object({
  username: z.string().max(255),
  email: z.string().max(255),
  password: z.string().max(255),
})

export class SignupCredentialsDTO extends createZodDto(
  signupCredentialsSchema,
) {}
