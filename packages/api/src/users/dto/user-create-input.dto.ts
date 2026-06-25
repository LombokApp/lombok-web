import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { stagingKeySchema } from '../../storage/dto/staging-upload.dto'

export const userCreateInputSchema = z.object({
  name: z.string().nonempty().optional(),
  email: z.string().nonempty().optional(),
  emailVerified: z.boolean().optional(),
  isAdmin: z.boolean().optional(),
  username: z.string(),
  password: z.string(),
  permissions: z.array(z.string()).optional(),
  // Optional reference to a staged avatar upload to apply to the new user.
  avatarStagingKey: stagingKeySchema.optional(),
})

export class UserCreateInputDTO extends createZodDto(userCreateInputSchema) {}
