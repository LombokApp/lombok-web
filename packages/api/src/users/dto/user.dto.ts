import { createZodDto } from 'nestjs-zod'
import { imageUrlsDTOSchema } from 'src/shared/dto/image-urls.dto'
import { z } from 'zod'

export const userDTOSchema = z.object({
  id: z.guid(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  emailVerified: z.boolean(),
  isAdmin: z.boolean(),
  username: z.string(),
  permissions: z.array(z.string()),
  avatar: imageUrlsDTOSchema.optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
})

export class UserDTO extends createZodDto(userDTOSchema) {}
