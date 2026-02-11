import { createZodDto } from 'nestjs-zod'
import { userDTOSchema } from 'src/users/dto/user.dto'
import { z } from 'zod'

export const userGetResponseSchema = z.object({
  user: userDTOSchema,
})

export class UserGetResponse extends createZodDto(userGetResponseSchema) {}
