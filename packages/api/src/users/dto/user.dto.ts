import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const userSchema = z.object({
  id: z.string(),
  name: z.string().nullish(),
  email: z.string().nullish(),
  emailVerified: z.boolean(),
  isAdmin: z.boolean(),
  username: z.string(),
  permissions: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export class UserDTO extends createZodDto(userSchema) {}
