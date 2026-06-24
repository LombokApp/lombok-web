import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { stagingKeySchema } from '../../storage/dto/staging-upload.dto'

export const userUpdateInputSchema = z.object({
  name: z.string().nonempty().or(z.null().optional()),
  email: z.string().nonempty().or(z.null().optional()),
  isAdmin: z.boolean().optional(),
  username: z.string().min(2).optional(),
  password: z.string().min(1).optional(),
  permissions: z.array(z.string()).optional(),
  // Optional reference to a staged avatar upload to apply to the user.
  avatarStagingKey: stagingKeySchema.optional(),
})

export class UserUpdateInputDTO extends createZodDto(userUpdateInputSchema) {}
