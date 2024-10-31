import { createZodDto } from '@anatine/zod-nestjs'
import { z } from 'zod'

import { AccessKeySort } from '../storage-location.service'

export const accessKeyListQueryParamsSchema = z.object({
  offset: z
    .preprocess(
      (a) => parseInt(a as string, 10),
      z.number().refine((a) => a > -1),
    )
    .optional(),
  limit: z
    .preprocess((a) => parseInt(a as string, 10), z.number().positive())
    .optional(),
  sort: z.nativeEnum(AccessKeySort).optional(),
})

export class AccessKeyListQueryParamsDTO extends createZodDto(
  accessKeyListQueryParamsSchema,
) {}
