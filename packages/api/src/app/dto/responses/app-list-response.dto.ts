import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { appSchema } from '../app.dto'

export const appListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(appSchema),
})

export class AppListResponse extends createZodDto(appListResponseSchema) {}
