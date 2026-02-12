import { accessKeyPublicSchema } from '@lombokapp/types'
import { createZodDto } from 'nestjs-zod'
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
