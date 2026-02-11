import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

export const userDTOSchema = z.object({
  id: z.guid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  emailVerified: z.boolean(),
  isAdmin: z.boolean(),
  username: z.string(),
  permissions: z.array(z.string()),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export class UserDTO extends createZodDto(userDTOSchema) {}
