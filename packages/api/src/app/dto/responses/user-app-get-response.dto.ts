import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { userAppSchema } from '../user-app.dto'

export const userAppGetResponseSchema = z.object({
  app: userAppSchema,
})

export class UserAppGetResponse extends createZodDto(
  userAppGetResponseSchema,
) {}
