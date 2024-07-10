import { createZodDto } from '@anatine/zod-nestjs'
import { userSchema } from 'src/users/dto/user.dto'
import { z } from 'zod'

export const userGetResponseSchema = z.object({
  user: userSchema,
})

export class UserGetResponse extends createZodDto(userGetResponseSchema) {}
