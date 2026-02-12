import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const userCreateInputSchema = z.object({
  name: z.string().nonempty().optional(),
  email: z.string().nonempty().optional(),
  emailVerified: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  username: z.string(),
  password: z.string(),
  permissions: z.array(z.string()).optional(),
})

export class UserCreateInputDTO extends createZodDto(userCreateInputSchema) {}
