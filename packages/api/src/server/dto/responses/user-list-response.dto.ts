import { createZodDto } from '@anatine/zod-nestjs'
import { userSchema } from 'src/users/dto/user.dto'
import { z } from 'zod'

export const userListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(userSchema),
})

export class UserListResponse extends createZodDto(userListResponseSchema) {}
