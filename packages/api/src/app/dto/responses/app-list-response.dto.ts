import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { adminAppSchema } from '../admin-app.dto'

export const appListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(adminAppSchema),
})

export class AppListResponse extends createZodDto(appListResponseSchema) {}
