import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { userAppDTOSchema } from '../user-app.dto'

export const userAppGetResponseSchema = z.object({
  app: userAppDTOSchema,
})

export class UserAppGetResponse extends createZodDto(
  userAppGetResponseSchema,
) {}
