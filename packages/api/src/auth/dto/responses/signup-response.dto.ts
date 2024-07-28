import { createZodDto } from '@anatine/zod-nestjs'
import { userSchema } from 'src/users/dto/user.dto'
import { z } from 'zod'

export const signupResponseSchema = z.object({
  user: userSchema,
})

export class SignupResponse extends createZodDto(signupResponseSchema) {}
