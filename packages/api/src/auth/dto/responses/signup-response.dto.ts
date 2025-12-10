import { createZodDto } from '@anatine/zod-nestjs'
import { userDTOSchema } from 'src/users/dto/user.dto'
import { z } from 'zod'

export const signupResponseSchema = z.object({
  user: userDTOSchema,
})

export class SignupResponse extends createZodDto(signupResponseSchema) {}
