import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const signupCredentialsSchema = z.object({
  username: z.string().min(3).max(64),
  email: z
    .string()
    .min(1, { message: 'This field has to be filled.' })
    .email('This is not a valid email.'),
  password: z.string().max(255),
})

export class SignupCredentialsDTO extends createZodDto(
  signupCredentialsSchema,
) {}
