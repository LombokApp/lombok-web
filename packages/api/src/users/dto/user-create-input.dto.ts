import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const userCreateInputSchema = z.object({
  name: z.string().nullish(),
  email: z.string().nullish(),
  emailVerified: z.boolean().optional(),
  isAdmin: z.boolean(),
  username: z.string(),
  password: z.string(),
  permissions: z.array(z.string()).optional(),
})

export class UserCreateInputDTO extends createZodDto(userCreateInputSchema) {}
