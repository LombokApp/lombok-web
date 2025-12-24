import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { adminAppDTOSchema } from '../admin-app.dto'

export const appListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(adminAppDTOSchema),
})

export class AppListResponse extends createZodDto(appListResponseSchema) {}
