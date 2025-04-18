import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { accessKeyPublicSchema } from '../access-key-public.dto'

export const accessKeyListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(accessKeyPublicSchema),
})

export class AccessKeyListResponse extends createZodDto(
  accessKeyListResponseSchema,
) {}
