import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { userAppSchema } from '../user-app.dto'

export const userAppListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(userAppSchema),
})

export class UserAppListResponse extends createZodDto(
  userAppListResponseSchema,
) {}
