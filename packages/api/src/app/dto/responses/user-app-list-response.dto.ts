import { createZodDto } from 'nestjs-zod'
import { z } from 'zod'

import { userAppDTOSchema } from '../user-app.dto'

export const userAppListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(userAppDTOSchema),
})

export class UserAppListResponse extends createZodDto(
  userAppListResponseSchema,
) {}
