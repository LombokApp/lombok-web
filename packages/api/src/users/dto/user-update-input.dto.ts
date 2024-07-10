import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const userUpdateInputSchema = z.object({
  name: z.string().nullish(),
  email: z.string().nullish(),
  emailVerified: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  permissions: z.array(z.string()).optional(),
})

export class UserUpdateInputDTO extends createZodDto(userUpdateInputSchema) {}
