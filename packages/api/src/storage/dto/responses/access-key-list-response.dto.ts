import { createZodDto } from '@anatine/zod-nestjs'
import { accessKeyPublicSchema } from '@lombokapp/types'
import { z } from 'zod'

export const accessKeyListResponseSchema = z.object({
  meta: z.object({
    totalCount: z.number(),
  }),
  result: z.array(accessKeyPublicSchema),
})

export class AccessKeyListResponse extends createZodDto(
  accessKeyListResponseSchema,
) {}
