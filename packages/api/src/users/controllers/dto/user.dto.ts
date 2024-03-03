import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const userSchema = z.object({
  name: z.string().optional(),
  email: z.string().optional(),
  emailVerified: z.boolean(),
  isAdmin: z.boolean(),
  username: z.boolean().optional(),
  permissions: z.array(z.string()),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export class UserDTO extends createZodDto(userSchema) {}
