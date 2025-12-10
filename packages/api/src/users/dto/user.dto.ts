import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

export const userDTOSchema = z.object({
  id: z.string().uuid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  emailVerified: z.boolean(),
  isAdmin: z.boolean(),
  username: z.string(),
  permissions: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
})

export class UserDTO extends createZodDto(userDTOSchema) {}
