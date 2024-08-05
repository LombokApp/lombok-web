import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { accessKeySchema } from '../access-key.dto'

export const accessKeyListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(accessKeySchema),
})

export class AccessKeyListResponse extends createZodDto(
  accessKeyListResponseSchema,
) {}
